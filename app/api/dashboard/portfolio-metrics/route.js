// app/api/dashboard/portfolio-metrics/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get portfolio metrics from multiple sources
    const cashFlowCollection = db.collection('ASSET_cash_flows')
    const inputsCollection = db.collection('ASSET_inputs_summary')
    
    // Get CAPEX, debt, and equity totals
    const capexPipeline = [
      {
        $group: {
          _id: null,
          totalCapex: { $sum: '$capex' },
          totalDebt: { $sum: '$debt_capex' },
          totalEquity: { $sum: '$equity_capex' }
        }
      }
    ]
    
    const capexResult = await cashFlowCollection.aggregate(capexPipeline).toArray()
    const capexData = capexResult[0] || { totalCapex: 0, totalDebt: 0, totalEquity: 0 }
    
    // Calculate gearing
    const gearing = capexData.totalCapex > 0 ? capexData.totalDebt / capexData.totalCapex : 0
    
    // Get IRR from asset inputs summary (if available)
    let irr = 0
    try {
      const irrResult = await inputsCollection.findOne({}, { 
        sort: { _id: -1 }, 
        projection: { 'Equity IRR': 1, irr: 1 } 
      })
      
      if (irrResult) {
        irr = irrResult['Equity IRR'] || irrResult.irr || 0
      }
    } catch (irrError) {
      console.warn('Could not fetch IRR from inputs collection:', irrError)
    }
    
    // Get total capacity from asset inputs
    let totalCapacity = 0
    try {
      const capacityPipeline = [
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: { $toDouble: '$capacity' } }
          }
        }
      ]
      
      const capacityResult = await inputsCollection.aggregate(capacityPipeline).toArray()
      totalCapacity = capacityResult[0]?.totalCapacity || 0
    } catch (capacityError) {
      console.warn('Could not calculate total capacity:', capacityError)
      
      // Fallback: try to get capacity from cash flows if available
      try {
        const capacityFallback = await cashFlowCollection.aggregate([
          { $group: { _id: '$asset_id' } },
          { $count: 'assetCount' }
        ]).toArray()
        
        // Rough estimate if we can't get actual capacity
        totalCapacity = (capacityFallback[0]?.assetCount || 0) * 100 // Assume 100MW per asset as fallback
      } catch (fallbackError) {
        console.warn('Capacity fallback also failed:', fallbackError)
      }
    }
    
    // Get latest cash flow data for additional metrics
    let latestMetrics = {}
    try {
      const latestData = await cashFlowCollection.findOne(
        {}, 
        { 
          sort: { date: -1 },
          projection: { 
            revenue: 1, 
            opex: 1, 
            cfads: 1, 
            equity_cash_flow: 1,
            date: 1 
          }
        }
      )
      
      if (latestData) {
        latestMetrics = {
          latestRevenue: latestData.revenue || 0,
          latestOpex: latestData.opex || 0,
          latestCfads: latestData.cfads || 0,
          latestDate: latestData.date
        }
      }
    } catch (latestError) {
      console.warn('Could not fetch latest metrics:', latestError)
    }
    
    const response = {
      totalCapex: capexData.totalCapex,
      totalDebt: capexData.totalDebt,
      totalEquity: capexData.totalEquity,
      gearing: gearing,
      irr: irr,
      totalCapacity: totalCapacity,
      ...latestMetrics
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Portfolio metrics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio metrics' },
      { status: 500 }
    )
  }
}