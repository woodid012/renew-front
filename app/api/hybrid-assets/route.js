// app/api/hybrid-assets/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const cashflowCollection = db.collection('ASSET_cash_flows');
    const configCollection = db.collection('CONFIG_Inputs');

    const { searchParams } = new URL(request.url);
    const hybridGroup = searchParams.get('hybrid_group');
    const period = searchParams.get('period');

    if (!hybridGroup) {
      return NextResponse.json({ error: 'Missing hybrid_group parameter' }, { status: 400 });
    }

    // Get asset configuration to find assets in this hybrid group
    const configData = await configCollection.findOne({});
    if (!configData || !configData.asset_inputs) {
      return NextResponse.json({ error: 'No asset configuration found' }, { status: 404 });
    }

    // Find assets with matching hybridGroup
    const hybridAssets = configData.asset_inputs.filter(
      asset => asset.hybridGroup === hybridGroup
    );

    if (hybridAssets.length === 0) {
      return NextResponse.json({ error: `No assets found for hybrid group: ${hybridGroup}` }, { status: 404 });
    }

    const assetIds = hybridAssets.map(asset => parseInt(asset.id));

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

    let pipeline = [];

    // Match assets in the hybrid group
    pipeline.push({ $match: { asset_id: { $in: assetIds } } });

    // Check if there's a combined hybrid asset row (from backend processing)
    // If hybrid_group column exists, prefer that
    const hasHybridGroupColumn = await cashflowCollection.findOne({ hybrid_group: hybridGroup });
    
    if (hasHybridGroupColumn) {
      // Use the pre-combined hybrid asset data
      pipeline = [{ $match: { hybrid_group: hybridGroup } }];
    }

    // Add aggregation stages based on period
    if (period === 'monthly') {
      pipeline.push({
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          date: { $first: '$date' },
          ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
        },
      });
      pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1 } });
    } else if (period === 'quarterly') {
      pipeline.push({
        $group: {
          _id: {
            year: { $year: '$date' },
            quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
          },
          date: { $first: '$date' },
          ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
        },
      });
      pipeline.push({ $sort: { '_id.year': 1, '_id.quarter': 1 } });
    } else if (period === 'yearly') {
      pipeline.push({
        $group: {
          _id: {
            year: { $year: '$date' },
          },
          date: { $first: '$date' },
          ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
        },
      });
      pipeline.push({ $sort: { '_id.year': 1 } });
    } else if (period === 'fiscal_yearly') {
      const fiscalYearStartMonth = 7;
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
            fiscalYear: '$fiscalYear',
          },
          date: { $first: '$date' },
          ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
        },
      });
      pipeline.push({ $sort: { '_id.fiscalYear': 1 } });
    } else {
      pipeline.push({ $sort: { date: 1 } });
    }

    const data = await cashflowCollection.aggregate(pipeline).toArray();

    // Get asset names for metadata
    const assetNames = hybridAssets.map(asset => asset.name).join(' + ');

    return NextResponse.json({
      data,
      metadata: {
        hybridGroup,
        assetIds,
        assetNames,
        componentCount: hybridAssets.length,
      },
    });
  } catch (error) {
    console.error('Error fetching hybrid asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch hybrid asset data' }, { status: 500 });
  }
}





