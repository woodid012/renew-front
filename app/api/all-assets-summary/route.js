// app/api/all-assets-summary/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { getPortfolioAssetIds, getPortfolioConfig } from '../utils/portfolio-helper';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const field = searchParams.get('field');
    const uniqueId = searchParams.get('unique_id');

    if (!uniqueId) {
      return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
    }

    // Get portfolio config (PlatformName is for display only, not used for filtering)
    const portfolioConfig = await getPortfolioConfig(db, uniqueId);
    if (!portfolioConfig) {
      return NextResponse.json({ error: 'Portfolio not found for the provided unique_id' }, { status: 404 });
    }
    const actualPortfolioName = portfolioConfig.PlatformName; // For display/logging only

    // Get asset IDs for this portfolio
    const portfolioAssetIds = await getPortfolioAssetIds(db, uniqueId);
    console.log(`All assets summary - Portfolio unique_id: ${uniqueId} (display name: ${actualPortfolioName}), Asset IDs: [${portfolioAssetIds.join(', ')}]`);

    if (!period || !field) {
      return NextResponse.json({ error: 'Missing period or field parameter' }, { status: 400 });
    }

    if (portfolioAssetIds.length === 0) {
      console.warn(`All assets summary - No asset IDs found for unique_id: ${uniqueId}`);
      return NextResponse.json({ data: {} });
    }

    // Use the portfolio config we already fetched

    const portfolioAssetNames = portfolioConfig && portfolioConfig.asset_inputs
      ? portfolioConfig.asset_inputs.map(a => a.name).filter(Boolean)
      : [];

    // Get verified asset IDs from ASSET_Output_Summary that match both ID and name
    let verifiedAssetIds = portfolioAssetIds;
    if (portfolioAssetNames.length > 0) {
      const outputSummaryCollection = db.collection('ASSET_Output_Summary');
      const normalizedPortfolioNames = portfolioAssetNames.map(n => n.trim().toLowerCase());

      // Filter by unique_id and asset IDs (primary identifier)
      const verifiedAssets = await outputSummaryCollection.find({
        unique_id: uniqueId,  // Filter by unique_id first
        asset_id: { $in: portfolioAssetIds }
      }).toArray();
      
      // If no results with unique_id, try fallback to portfolio name for backward compatibility
      if (verifiedAssets.length === 0) {
        const fallbackAssets = await outputSummaryCollection.find({
          portfolio: actualPortfolioName,  // Fallback to portfolio name
          asset_id: { $in: portfolioAssetIds }
        }).toArray();
        if (fallbackAssets.length > 0) {
          console.log(`All assets summary - Using portfolio name fallback for verification`);
        }
      }

      // Filter by name to get only assets that belong to this portfolio
      const verifiedAssetsFiltered = verifiedAssets.filter(asset => {
        const normalizedAssetName = (asset.asset_name || '').trim().toLowerCase();
        return normalizedPortfolioNames.includes(normalizedAssetName);
      });

      verifiedAssetIds = verifiedAssetsFiltered.map(a => a.asset_id);
      console.log(`All assets summary - Verified ${verifiedAssetIds.length} asset IDs for portfolio ${actualPortfolioName}: [${verifiedAssetIds.join(', ')}]`);

      if (verifiedAssetIds.length === 0) {
        console.warn(`All assets summary - No verified asset IDs found for portfolio ${actualPortfolioName}. Asset IDs from config don't match assets in ASSET_Output_Summary.`);
        return NextResponse.json({ data: {} });
      }
    }

    const numericalFields = [
      'revenue',
      'contractedGreenRevenue',
      'contractedEnergyRevenue',
      'merchantGreenRevenue',
      'merchantEnergyRevenue',
      'monthlyGeneration',
      'avgGreenPrice',
      'avgEnergyPrice',
      'opex',
      'capex',
      'equity_capex',
      'debt_capex',
      'beginning_balance',
      'drawdowns',
      'interest',
      'principal',
      'ending_balance',
      'd_and_a',
      'cfads',
      'debt_service',
      'ebit',
      'ebt',
      'tax_expense',
      'net_income',
      'terminal_value',
      'equity_cash_flow',
      'equity_cash_flow_pre_distributions',
      'equity_injection',
      'cumulative_capex',
      'cumulative_d_and_a',
      'fixed_assets',
      'debt',
      'share_capital',
      'retained_earnings',
      'cash',
      'total_assets',
      'total_liabilities',
      'net_assets',
      'equity',
      'distributions',
      'dividends',
      'redistributed_capital',
    ];

    if (!numericalFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid field for aggregation' }, { status: 400 });
    }

    let pipeline = [];
    let groupStageId = {};
    let sortStage = {};

    const fiscalYearStartMonth = 7; // Assuming July as the start month for fiscal year

    if (period === 'monthly') {
      groupStageId = {
        year: { $year: '$date' },
        month: { $month: '$date' },
      };
      sortStage = { '_id.year': 1, '_id.month': 1 };
    } else if (period === 'quarterly') {
      groupStageId = {
        year: { $year: '$date' },
        quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
      };
      sortStage = { '_id.year': 1, '_id.quarter': 1 };
    } else if (period === 'yearly') {
      groupStageId = {
        year: { $year: '$date' },
      };
      sortStage = { '_id.year': 1 };
    } else if (period === 'fiscal_yearly') {
      // First add the fiscal year field
      pipeline.push({
        $addFields: {
          fiscalYear: {
            $cond: {
              if: { $lt: [{ $month: '$date' }, fiscalYearStartMonth] },
              then: { $subtract: [{ $year: '$date' }, 1] },
              else: { $year: '$date' },
            },
          },
        },
      });

      groupStageId = {
        fiscalYear: '$fiscalYear',
      };
      sortStage = { '_id.fiscalYear': 1 };
    } else {
      return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
    }

    // Always filter by VERIFIED portfolio asset IDs and unique_id - if empty array, will return no results (correct behavior)
    // Never skip the filter as it would return ALL assets from all portfolios
    pipeline.unshift({
      $match: {
        asset_id: { $in: verifiedAssetIds },
        unique_id: uniqueId  // Filter by unique_id (primary identifier)
      }
    });

    pipeline.push({
      $group: {
        _id: { ...groupStageId, asset_id: '$asset_id' },
        totalValue: { $sum: `$${field}` },
      },
    });

    pipeline.push({ $sort: sortStage });

    const data = await collection.aggregate(pipeline).toArray();
    console.log(`All assets summary - Found ${data.length} records for portfolio ${actualPortfolioName}, field ${field}, period ${period}`);

    // Transform data for easier consumption by frontend (group by period, then by asset)
    const transformedData = {};
    data.forEach(item => {
      let periodKey;
      if (period === 'monthly') {
        periodKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else if (period === 'quarterly') {
        periodKey = `${item._id.year}-Q${item._id.quarter}`;
      } else if (period === 'yearly') {
        periodKey = `${item._id.year}`;
      } else if (period === 'fiscal_yearly') {
        periodKey = `FY${item._id.fiscalYear}`;
      }

      if (!transformedData[periodKey]) {
        transformedData[periodKey] = {};
      }
      transformedData[periodKey][item._id.asset_id] = item.totalValue;
    });

    console.log(`All assets summary - Transformed data for portfolio ${actualPortfolioName}:`, {
      periods: Object.keys(transformedData).length,
      assetIds: [...new Set(Object.values(transformedData).flatMap(p => Object.keys(p)))]
    });

    return NextResponse.json({ data: transformedData });

  } catch (error) {
    console.error('Error fetching all assets summary data:', error);
    return NextResponse.json({ error: 'Failed to fetch all assets summary data' }, { status: 500 });
  }
}