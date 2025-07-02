// app/api/results/assets/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Try to get asset list from inputs summary first
    let assets = []
    
    try {
      const inputsCollection = db.collection('ASSET_inputs_summary')
      const inputAssets = await inputsCollection.find({}, {
        projection: {
          asset_id: 1,
          asset_name: 1,
          name: 1,
          type: 1,
          region: 1,
          capacity: 1,
          OperatingStartDate: 1,
          cost_capex: 1
        }
      }).toArray()
      
      if (inputAssets.length > 0) {
        assets = inputAssets.map(asset => ({
          asset_id: asset.asset_id,
          name: asset.asset_name || asset.name || `Asset ${asset.asset_id}`,
          type: asset.type || 'unknown',
          region: asset.region || 'unknown',
          capacity: asset.capacity || 0,
          operatingStartDate: asset.OperatingStartDate,
          capex: asset.cost_capex || 0
        }))
      }
    } catch (inputsError) {
      console.warn('Could not fetch from inputs collection:', inputsError)
    }
    
    // Fallback: Get asset list from cash flows collection
    if (assets.length === 0) {
      try {
        const cashFlowCollection = db.collection('ASSET_cash_flows')
        
        // Aggregate asset information from cash flows
        const assetsPipeline = [
          {
            $group: {
              _id: '$asset_id',
              asset_id: { $first: '$asset_id' },
              totalRevenue: { $sum: '$revenue' },
              totalOpex: { $sum: '$opex' },
              totalCapex: { $sum: '$capex' },
              totalEquityCashFlow: { $sum: '$equity_cash_flow' },
              firstDate: { $min: '$date' },
              lastDate: { $max: '$date' },
              recordCount: { $sum: 1 },
              avgRevenue: { $avg: '$revenue' },
              avgOpex: { $avg: '$opex' }
            }
          },
          {
            $addFields: {
              name: { $concat: ['Asset ', { $toString: '$asset_id' }] },
              type: 'unknown',
              region: 'unknown',
              capacity: { $multiply: ['$totalCapex', 0.001] }, // Rough estimate
              operatingStartDate: '$firstDate',
              capex: '$totalCapex'
            }
          },
          {
            $sort: { asset_id: 1 }
          }
        ]
        
        const cashFlowAssets = await cashFlowCollection.aggregate(assetsPipeline).toArray()
        
        assets = cashFlowAssets.map(asset => ({
          asset_id: asset.asset_id,
          name: asset.name,
          type: asset.type,
          region: asset.region,
          capacity: asset.capacity,
          operatingStartDate: asset.operatingStartDate,
          capex: asset.capex,
          performance: {
            totalRevenue: asset.totalRevenue,
            totalOpex: asset.totalOpex,
            totalEquityCashFlow: asset.totalEquityCashFlow,
            avgRevenue: asset.avgRevenue,
            avgOpex: asset.avgOpex,
            recordCount: asset.recordCount,
            dateRange: {
              start: asset.firstDate,
              end: asset.lastDate
            }
          }
        }))
        
      } catch (cashFlowError) {
        console.error('Could not fetch from cash flows collection:', cashFlowError)
        
        return NextResponse.json({
          assets: [],
          source: 'empty_fallback',
          count: 0,
          message: 'No asset data found'
        })
      }
    }
    
    // Get additional performance metrics for each asset
    if (assets.length > 0) {
      const cashFlowCollection = db.collection('ASSET_cash_flows')
      
      for (let asset of assets) {
        try {
          // Get performance summary for this asset
          const performancePipeline = [
            { $match: { asset_id: asset.asset_id } },
            {
              $group: {
                _id: '$asset_id',
                totalRevenue: { $sum: '$revenue' },
                totalOpex: { $sum: '$opex' },
                totalCapex: { $sum: '$capex' },
                totalEquityCashFlow: { $sum: '$equity_cash_flow' },
                totalCfads: { $sum: '$cfads' },
                avgRevenue: { $avg: '$revenue' },
                avgOpex: { $avg: '$opex' },
                maxRevenue: { $max: '$revenue' },
                minRevenue: { $min: '$revenue' },
                firstDate: { $min: '$date' },
                lastDate: { $max: '$date' },
                recordCount: { $sum: 1 }
              }
            }
          ]
          
          const performanceResult = await cashFlowCollection.aggregate(performancePipeline).toArray()
          
          if (performanceResult.length > 0) {
            const perf = performanceResult[0]
            asset.performance = {
              totalRevenue: perf.totalRevenue || 0,
              totalOpex: perf.totalOpex || 0,
              totalCapex: perf.totalCapex || 0,
              totalEquityCashFlow: perf.totalEquityCashFlow || 0,
              totalCfads: perf.totalCfads || 0,
              avgRevenue: perf.avgRevenue || 0,
              avgOpex: perf.avgOpex || 0,
              maxRevenue: perf.maxRevenue || 0,
              minRevenue: perf.minRevenue || 0,
              recordCount: perf.recordCount || 0,
              dateRange: {
                start: perf.firstDate,
                end: perf.lastDate
              }
            }
          }
          
        } catch (perfError) {
          console.warn(`Could not get performance for asset ${asset.asset_id}:`, perfError)
          asset.performance = {
            totalRevenue: 0,
            totalOpex: 0,
            totalCapex: 0,
            totalEquityCashFlow: 0,
            totalCfads: 0,
            avgRevenue: 0,
            avgOpex: 0,
            recordCount: 0
          }
        }
      }
    }
    
    // Calculate portfolio summary
    const portfolioSummary = assets.reduce((acc, asset) => {
      const perf = asset.performance || {}
      return {
        totalAssets: acc.totalAssets + 1,
        totalCapacity: acc.totalCapacity + (parseFloat(asset.capacity) || 0),
        totalCapex: acc.totalCapex + (parseFloat(asset.capex) || 0),
        totalRevenue: acc.totalRevenue + (perf.totalRevenue || 0),
        totalOpex: acc.totalOpex + (perf.totalOpex || 0),
        totalEquityCashFlow: acc.totalEquityCashFlow + (perf.totalEquityCashFlow || 0)
      }
    }, {
      totalAssets: 0,
      totalCapacity: 0,
      totalCapex: 0,
      totalRevenue: 0,
      totalOpex: 0,
      totalEquityCashFlow: 0
    })
    
    // Group assets by type and region for summary
    const byType = assets.reduce((acc, asset) => {
      const type = asset.type || 'unknown'
      if (!acc[type]) acc[type] = 0
      acc[type]++
      return acc
    }, {})
    
    const byRegion = assets.reduce((acc, asset) => {
      const region = asset.region || 'unknown'
      if (!acc[region]) acc[region] = 0
      acc[region]++
      return acc
    }, {})
    
    return NextResponse.json({
      assets: assets,
      summary: portfolioSummary,
      breakdown: {
        byType: byType,
        byRegion: byRegion
      },
      count: assets.length,
      source: assets.length > 0 ? (assets[0].performance?.recordCount ? 'cash_flows_enhanced' : 'inputs_summary') : 'empty'
    })
    
  } catch (error) {
    console.error('Results assets API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets for results', details: error.message },
      { status: 500 }
    )
  }
}