// app/api/three-way-forecast/route.js

import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { getPortfolioAssetIds, getPortfolioConfig } from '../utils/portfolio-helper';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset_id');
    const period = searchParams.get('period');
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

    // Enhanced fields for comprehensive 3-way financials
    const profitLossFields = [
      'revenue', 'opex', 'ebitda', 'd_and_a', 'ebit', 'interest', 'ebt', 'tax_expense', 'net_income'
    ];

    const balanceSheetFields = [
      'cash', 'fixed_assets', 'total_assets', 'debt', 'total_liabilities', 
      'equity', 'share_capital', 'retained_earnings', 'cumulative_capex', 'cumulative_d_and_a'
    ];

    const cashFlowFields = [
      // Operating Activities
      'cfads', 'operating_cash_flow',
      // Investing Activities  
      'capex', 'terminal_value', 'investing_cash_flow',
      // Financing Activities
      'drawdowns', 'interest', 'principal', 'equity_injection', 'distributions', 
      'dividends', 'redistributed_capital', 'financing_cash_flow',
      // Pre and Post Distribution Equity Cash Flows
      'equity_cash_flow_pre_distributions', 'equity_cash_flow',
      // Net Cash Flow
      'net_cash_flow',
      // Debt Service
      'debt_service', 'beginning_balance', 'ending_balance'
    ];

    // All fields combined
    const allFields = [...new Set([...profitLossFields, ...balanceSheetFields, ...cashFlowFields])];

    if (assetId) {
      let pipeline = [];

      // Verify asset belongs to portfolio and match by asset_id
      const assetIdInt = parseInt(assetId);
      if (portfolioAssetIds.length > 0 && !portfolioAssetIds.includes(assetIdInt)) {
        // Asset doesn't belong to this portfolio
        return NextResponse.json({ data: [] });
      }
      
      // Filter by both asset_id AND unique_id to ensure we get the correct data
      pipeline.push({ $match: { asset_id: assetIdInt, unique_id: uniqueId } });

      // Add aggregation stages based on period
      if (period === 'monthly') {
        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            date: { $last: '$date' },
            ...allFields.reduce((acc, field) => {
              if (balanceSheetFields.includes(field)) {
                return { ...acc, [field]: { $last: `$${field}` } };
              } else {
                return { ...acc, [field]: { $sum: `$${field}` } };
              }
            }, {}),
          },
        });
        pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1 } });
      } else if (period === 'quarterly') {
        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
              year: { $year: '$date' },
              quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
            },
            date: { $last: '$date' },
            ...allFields.reduce((acc, field) => {
              if (balanceSheetFields.includes(field)) {
                return { ...acc, [field]: { $last: `$${field}` } };
              } else {
                return { ...acc, [field]: { $sum: `$${field}` } };
              }
            }, {}),
          },
        });
        pipeline.push({ $sort: { '_id.year': 1, '_id.quarter': 1 } });
      } else if (period === 'yearly') {
        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
              year: { $year: '$date' },
            },
            date: { $last: '$date' },
            ...allFields.reduce((acc, field) => {
              if (balanceSheetFields.includes(field)) {
                return { ...acc, [field]: { $last: `$${field}` } };
              } else {
                return { ...acc, [field]: { $sum: `$${field}` } };
              }
            }, {}),
          },
        });
        pipeline.push({ $sort: { '_id.year': 1 } });
      } else if (period === 'fiscal_yearly') {
        const fiscalYearStartMonth = 7; // July as the start month for fiscal year

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

        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
              fiscalYear: '$fiscalYear',
            },
            date: { $last: '$date' },
            ...allFields.reduce((acc, field) => {
              if (balanceSheetFields.includes(field)) {
                return { ...acc, [field]: { $last: `$${field}` } };
              } else {
                return { ...acc, [field]: { $sum: `$${field}` } };
              }
            }, {}),
          },
        });
        
        pipeline.push({ $sort: { '_id.fiscalYear': 1 } });
      } else {
        // Default: return all documents sorted by date
        pipeline.push({ $sort: { date: 1 } });
      }

      const data = await collection.aggregate(pipeline).toArray();
      return NextResponse.json({ data });
    } else {
      // Return unique asset IDs and names for this portfolio
      const uniqueAssetIdsFromCashFlows = portfolioAssetIds.length > 0
        ? await collection.distinct('asset_id', { 
            asset_id: { $in: portfolioAssetIds },
            unique_id: uniqueId  // Filter by unique_id (primary identifier)
          })
        : [];

      // Use the portfolio config we already fetched
      const assetNames = portfolioConfig.asset_inputs
        ? portfolioConfig.asset_inputs
            .filter(asset => uniqueAssetIdsFromCashFlows.includes(parseInt(asset.id)))
            .map(asset => ({ _id: parseInt(asset.id), name: asset.name }))
        : [];

      return NextResponse.json({ uniqueAssetIds: assetNames });
    }
  } catch (error) {
    console.error('Error fetching 3-way forecast data:', error);
    return NextResponse.json({ error: 'Failed to fetch 3-way forecast data' }, { status: 500 });
  }
}