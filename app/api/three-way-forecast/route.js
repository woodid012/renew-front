// app/api/three-way-forecast/route.js

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
      // Return unique asset IDs and names
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