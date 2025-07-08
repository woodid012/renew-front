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

    // Fields relevant for P&L, Balance Sheet, and Cash Flow Statement
    const financialFields = [
      // P&L
      'revenue', 'opex', 'd_and_a', 'ebit', 'ebt', 'tax_expense', 'net_income',
      // Balance Sheet
      'cash', 'fixed_assets', 'total_assets', 'debt', 'total_liabilities', 'equity', 'share_capital', 'retained_earnings',
      // Cash Flow Statement (from ASSET_cash_flows)
      'capex', 'equity_cash_flow', 'debt_service', 'cfads', 'beginning_balance', 'drawdowns', 'interest', 'principal', 'ending_balance', 'equity_injection', 'distributions', 'dividends', 'redistributed_capital',
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
            ...financialFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
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
            ...financialFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
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
            ...financialFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
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
            ...financialFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
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
      // If no asset_id, return all unique asset_ids and names
      const uniqueAssetIdsFromCashFlows = await collection.distinct('asset_id');

      const configCollection = db.collection('CONFIG_Inputs');
      const assetNames = await configCollection.aggregate([
        { $unwind: '$asset_inputs' },
        { $match: { 'asset_inputs.id': { $in: uniqueAssetIdsFromCashFlows } } },
        { $project: { _id: '$asset_inputs.id', name: '$asset_inputs.name' } }
      ]).toArray();

      return NextResponse.json({ uniqueAssetIds: assetNames });
    }
  } catch (error) {
    console.error('Error fetching 3-way forecast data:', error);
    return NextResponse.json({ error: 'Failed to fetch 3-way forecast data' }, { status: 500 });
  }
}
