// app/api/dashboard/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const collection = db.collection('ASSET_cash_flows')
    
    // 1. Portfolio Summary Aggregation
    const summaryPipeline = [
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          totalOpex: { $sum: '$opex' },
          totalEquityCashFlow: { $sum: '$equity_cash_flow' },
        }
      }
    ]
    
    // 2. Portfolio Metrics Aggregation
    const metricsPipeline = [
      {
        $group: {
          _id: null,
          totalCapex: { $sum: '$capex' },
          totalDebt: { $sum: '$debt_capex' },
          totalCapacity: { $sum: '$capacity_mw' } // Assuming capacity is in the data
        }
      },
      {
        $project: {
          _id: 0,
          totalCapex: 1,
          totalDebt: 1,
          totalCapacity: 1,
          gearing: {
            $cond: { if: { $gt: ['$totalCapex', 0] }, then: { $divide: ['$totalDebt', '$totalCapex'] }, else: 0 }
          }
        }
      }
    ]

    // 3. Asset Count Aggregation
    const assetCountPipeline = [
      { $group: { _id: '$asset_id' } },
      { $count: 'totalAssets' }
    ];

    const [summaryResult, metricsResult, assetCountResult] = await Promise.all([
      collection.aggregate(summaryPipeline).toArray(),
      collection.aggregate(metricsPipeline).toArray(),
      collection.aggregate(assetCountPipeline).toArray()
    ]);

    const summary = summaryResult[0] || { totalRevenue: 0, totalOpex: 0, totalEquityCashFlow: 0 };
    const metrics = metricsResult[0] || { totalCapex: 0, totalDebt: 0, totalCapacity: 0, gearing: 0 };
    const assetCount = assetCountResult[0] || { totalAssets: 0 };

    // Combine all results into a single response
    const dashboardData = {
      totalAnnualRevenue: summary.totalRevenue,
      totalAnnualOpex: summary.totalOpex,
      totalAnnualCashFlow: summary.totalEquityCashFlow,
      totalCapex: metrics.totalCapex,
      totalDebt: metrics.totalDebt,
      totalCapacity: metrics.totalCapacity,
      gearing: metrics.gearing,
      irr: 0, // IRR calculation needs to be handled separately if needed
      totalAssets: assetCount.totalAssets,
    };

    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}