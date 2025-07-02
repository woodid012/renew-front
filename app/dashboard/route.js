// app/api/dashboard/summary/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get the main cash flows collection
    const collection = db.collection('ASSET_cash_flows')
    
    // Aggregate pipeline to calculate portfolio summary
    const pipeline = [
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          totalOpex: { $sum: '$opex' },
          totalCapex: { $sum: '$capex' },
          totalEquityCashFlow: { $sum: '$equity_cash_flow' },
          totalCfads: { $sum: '$cfads' },
          totalDebt: { $sum: '$debt_capex' },
          totalEquity: { $sum: '$equity_capex' },
          recordCount: { $sum: 1 }
        }
      }
    ]
    
    const result = await collection.aggregate(pipeline).toArray()
    
    if (!result || result.length === 0) {
      return NextResponse.json({
        totalAnnualRevenue: 0,
        totalAnnualOpex: 0,
        totalAnnualCashFlow: 0,
        totalCapex: 0,
        totalDebt: 0,
        totalEquity: 0,
        recordCount: 0
      })
    }
    
    const summary = result[0]
    
    // Calculate annualized figures (assuming monthly data)
    // Note: This is a rough calculation - you might want to be more precise
    const monthsOfData = summary.recordCount || 1
    const annualizationFactor = monthsOfData > 0 ? 12 : 1
    
    return NextResponse.json({
      totalAnnualRevenue: summary.totalRevenue || 0,
      totalAnnualOpex: summary.totalOpex || 0,
      totalAnnualCashFlow: summary.totalEquityCashFlow || 0,
      totalCapex: summary.totalCapex || 0,
      totalDebt: summary.totalDebt || 0,
      totalEquity: summary.totalEquity || 0,
      recordCount: summary.recordCount || 0,
      dataMonths: monthsOfData
    })
    
  } catch (error) {
    console.error('Dashboard summary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    )
  }
}