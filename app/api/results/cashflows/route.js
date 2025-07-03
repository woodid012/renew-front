// app/api/results/cashflows/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const assetIds = searchParams.get('assets')?.split(',').map(id => parseInt(id))
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit')) || 1000
    const scenarioId = searchParams.get('scenarioId') // For sensitivity analysis
    
    // Determine which collection to use
    let collectionName = 'ASSET_cash_flows'
    if (scenarioId && scenarioId.startsWith('sensitivity_results')) {
      collectionName = 'SENS_Asset_Outputs'
    }
    
    const collection = db.collection(collectionName)
    
    // Build query
    let query = {}
    
    // Filter by scenario if provided
    if (scenarioId) {
      query.scenario_id = scenarioId
    }
    
    // Filter by asset IDs if provided
    if (assetIds && assetIds.length > 0) {
      query.asset_id = { $in: assetIds }
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate)
      }
    }
    
    console.log(`Querying collection: ${collectionName} with query:`, query)
    
    // Get cash flow data with projection for performance
    const cashFlows = await collection
      .find(query, {
        projection: {
          asset_id: 1,
          date: 1,
          revenue: 1,
          contractedGreenRevenue: 1,
          contractedEnergyRevenue: 1,
          merchantGreenRevenue: 1,
          merchantEnergyRevenue: 1,
          opex: 1,
          capex: 1,
          equity_capex: 1,
          debt_capex: 1,
          equity_cash_flow: 1,
          cfads: 1,
          interest: 1,
          principal: 1,
          terminal_value: 1,
          period_type: 1,
          scenario_id: 1
        }
      })
      .sort({ date: 1, asset_id: 1 })
      .limit(limit)
      .toArray()
    
    // Get summary statistics
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalRevenue: { $sum: '$revenue' },
          totalOpex: { $sum: '$opex' },
          totalCapex: { $sum: '$capex' },
          totalEquityCashFlow: { $sum: '$equity_cash_flow' },
          totalCfads: { $sum: '$cfads' },
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          uniqueAssets: { $addToSet: '$asset_id' }
        }
      }
    ]
    
    const summaryResult = await collection.aggregate(summaryPipeline).toArray()
    const summary = summaryResult[0] || {
      totalRecords: 0,
      totalRevenue: 0,
      totalOpex: 0,
      totalCapex: 0,
      totalEquityCashFlow: 0,
      totalCfads: 0,
      minDate: null,
      maxDate: null,
      uniqueAssets: []
    }
    
    // Get monthly aggregated data for charts
    const monthlyPipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            asset_id: '$asset_id'
          },
          revenue: { $sum: '$revenue' },
          opex: { $sum: '$opex' },
          capex: { $sum: '$capex' },
          equity_cash_flow: { $sum: '$equity_cash_flow' },
          cfads: { $sum: '$cfads' },
          contractedGreenRevenue: { $sum: '$contractedGreenRevenue' },
          contractedEnergyRevenue: { $sum: '$contractedEnergyRevenue' },
          merchantGreenRevenue: { $sum: '$merchantGreenRevenue' },
          merchantEnergyRevenue: { $sum: '$merchantEnergyRevenue' },
          date: { $first: '$date' }
        }
      },
      {
        $addFields: {
          monthYear: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          },
          asset_id: '$_id.asset_id'
        }
      },
      {
        $sort: { monthYear: 1, asset_id: 1 }
      }
    ]
    
    const monthlyData = await collection.aggregate(monthlyPipeline).toArray()
    
    // Get asset breakdown
    const assetBreakdownPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$asset_id',
          totalRevenue: { $sum: '$revenue' },
          totalOpex: { $sum: '$opex' },
          totalCapex: { $sum: '$capex' },
          totalEquityCashFlow: { $sum: '$equity_cash_flow' },
          totalCfads: { $sum: '$cfads' },
          recordCount: { $sum: 1 },
          firstDate: { $min: '$date' },
          lastDate: { $max: '$date' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]
    
    const assetBreakdown = await collection.aggregate(assetBreakdownPipeline).toArray()
    
    return NextResponse.json({
      data: cashFlows,
      monthlyData: monthlyData,
      assetBreakdown: assetBreakdown,
      summary: {
        ...summary,
        uniqueAssetCount: summary.uniqueAssets.length
      },
      metadata: {
        query: query,
        collection: collectionName,
        recordCount: cashFlows.length,
        limit: limit,
        hasMore: cashFlows.length === limit,
        scenarioId: scenarioId
      }
    })
    
  } catch (error) {
    console.error('Cash flows API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cash flows', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const body = await request.json()
    const { assets, dateRange, aggregationType, scenarioId } = body
    
    // Determine which collection to use
    let collectionName = 'ASSET_cash_flows'
    if (scenarioId && scenarioId.startsWith('sensitivity_results')) {
      collectionName = 'SENS_Asset_Outputs'
    }
    
    const collection = db.collection(collectionName)
    
    // Build aggregation pipeline based on request
    let pipeline = []
    
    // Match stage
    let matchStage = {}
    if (scenarioId) {
      matchStage.scenario_id = scenarioId
    }
    if (assets && assets.length > 0) {
      matchStage.asset_id = { $in: assets }
    }
    if (dateRange && dateRange.start && dateRange.end) {
      matchStage.date = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      }
    }
    
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }
    
    // Group stage based on aggregation type
    let groupStage = {
      _id: null,
      totalRevenue: { $sum: '$revenue' },
      totalOpex: { $sum: '$opex' },
      totalCapex: { $sum: '$capex' },
      totalEquityCashFlow: { $sum: '$equity_cash_flow' },
      totalCfads: { $sum: '$cfads' },
      avgRevenue: { $avg: '$revenue' },
      avgOpex: { $avg: '$opex' },
      count: { $sum: 1 }
    }
    
    if (aggregationType === 'monthly') {
      groupStage._id = {
        year: { $year: '$date' },
        month: { $month: '$date' }
      }
    } else if (aggregationType === 'quarterly') {
      groupStage._id = {
        year: { $year: '$date' },
        quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } }
      }
    } else if (aggregationType === 'yearly') {
      groupStage._id = { $year: '$date' }
    } else if (aggregationType === 'by_asset') {
      groupStage._id = '$asset_id'
    }
    
    pipeline.push({ $group: groupStage })
    pipeline.push({ $sort: { _id: 1 } })
    
    const result = await collection.aggregate(pipeline).toArray()
    
    return NextResponse.json({
      data: result,
      aggregationType: aggregationType,
      recordCount: result.length,
      collection: collectionName,
      scenarioId: scenarioId
    })
    
  } catch (error) {
    console.error('Cash flows aggregation error:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate cash flows', details: error.message },
      { status: 500 }
    )
  }
}