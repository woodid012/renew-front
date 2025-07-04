// app/api/asset-output-data/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset_id');
    const period = searchParams.get('period');

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

    if (assetId) {
      let pipeline = [];

      // Match by asset_id
      pipeline.push({ $match: { asset_id: parseInt(assetId) } });

      // Add aggregation stages based on period
      if (period === 'monthly') {
        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
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
              asset_id: '$asset_id',
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
              asset_id: '$asset_id',
              year: { $year: '$date' },
            },
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });
        pipeline.push({ $sort: { '_id.year': 1 } });
      } else if (period === 'fiscal_yearly') {
        const fiscalYearStartMonth = 7; // July as the start month for fiscal year

        // First, add fields to calculate fiscal year
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

        // Then group by fiscal year
        pipeline.push({
          $group: {
            _id: {
              asset_id: '$asset_id',
              fiscalYear: '$fiscalYear',
            },
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });
        
        pipeline.push({ $sort: { '_id.fiscalYear': 1 } });
      } else {
        // Default: return all documents sorted by date if no period or invalid period
        pipeline.push({ $sort: { date: 1 } });
      }

      const data = await collection.aggregate(pipeline).toArray();
      return NextResponse.json({ data });
    } else {
      // If no asset_id, return all unique asset_ids
      const uniqueAssetIds = await collection.distinct('asset_id');
      return NextResponse.json({ uniqueAssetIds });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}