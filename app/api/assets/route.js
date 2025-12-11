// app/api/assets/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'
import { getPortfolioAssetIds } from '../utils/portfolio-helper'

export async function GET(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get unique_id parameter from query string
    const { searchParams } = new URL(request.url);
    const uniqueId = searchParams.get('unique_id');
    
    if (!uniqueId) {
      return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
    }
    
    // Get asset IDs for this portfolio
    const portfolioAssetIds = await getPortfolioAssetIds(db, uniqueId);
    console.log(`Assets API - unique_id: ${uniqueId}, Asset IDs: [${portfolioAssetIds.join(', ')}]`);
    
    // Try to get assets from inputs summary first (preferred source)
    let assets = []
    
    try {
      const inputsCollection = db.collection('ASSET_inputs_summary')
      
      // Filter by unique_id (primary) and asset IDs (secondary) for accuracy
      // IMPORTANT: Only show base case (scenario_id is null, missing, or empty)
      let query = { 
        unique_id: uniqueId,
        $or: [
          { scenario_id: { $exists: false } },
          { scenario_id: null },
          { scenario_id: '' }
        ]
      };
      if (portfolioAssetIds.length > 0) {
        query.asset_id = { $in: portfolioAssetIds };
      } else {
        console.warn(`Assets API - No asset IDs found for unique_id: ${uniqueId}, filtering by unique_id only`);
      }
      
      const rawAssets = await inputsCollection.find(query).toArray()
      
      console.log(`Found ${rawAssets.length} assets in inputs summary collection`)
      
      if (rawAssets.length > 0) {
        // Transform the data to match frontend expectations
        assets = rawAssets.map(asset => ({
          asset_id: asset.asset_id,
          asset_name: asset.asset_name || asset.name || `Asset ${asset.asset_id}`,
          name: asset.asset_name || asset.name || `Asset ${asset.asset_id}`,
          type: asset.type || 'unknown',
          region: asset.region || 'unknown',
          capacity: parseFloat(asset.capacity) || 0,
          OperatingStartDate: asset.OperatingStartDate,
          constructionStartDate: asset.constructionStartDate,
          assetLife: asset.assetLife || 25,
          cost_capex: parseFloat(asset.cost_capex) || 0,
          cost_maxGearing: parseFloat(asset.cost_maxGearing) || 0,
          cost_interestRate: parseFloat(asset.cost_interestRate) || 0,
          cost_tenorYears: parseFloat(asset.cost_tenorYears) || 18,
          cost_terminalValue: parseFloat(asset.cost_terminalValue) || 0,
          cost_operatingCosts: parseFloat(asset.cost_operatingCosts) || 0,
          cost_operatingCostEscalation: parseFloat(asset.cost_operatingCostEscalation) || 0,
          cost_targetDSCRContract: parseFloat(asset.cost_targetDSCRContract) || 0,
          cost_targetDSCRMerchant: parseFloat(asset.cost_targetDSCRMerchant) || 0,
          volumeLossAdjustment: parseFloat(asset.volumeLossAdjustment) || 95,
          annualDegradation: parseFloat(asset.annualDegradation) || 0.5,
          capacityFactor: parseFloat(asset.capacityFactor) || 25,
          // Include contract information if available
          contracts: asset.contracts || [],
          // Additional metadata
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        }))
        
        return NextResponse.json({
          assets: assets,
          source: 'inputs_summary',
          count: assets.length
        })
      }
    } catch (inputsError) {
      console.warn('Could not fetch from inputs summary collection:', inputsError)
    }
    
    // Fallback: Create asset summaries from cash flows collection
    try {
      const cashFlowCollection = db.collection('ASSET_cash_flows')
      
      // Filter by portfolio asset IDs
      if (portfolioAssetIds.length === 0) {
        return NextResponse.json({
          assets: [],
          source: 'cash_flows_aggregated',
          count: 0,
          message: `No assets found for unique_id: ${uniqueId}`
        });
      }
      
      // Aggregate unique asset information from cash flows
      // Filter by unique_id (primary) and asset IDs (secondary) for accuracy
      // IMPORTANT: Only show base case (scenario_id is null, missing, or empty)
      const assetsPipeline = [
        {
          $match: { 
            unique_id: uniqueId,
            asset_id: { $in: portfolioAssetIds },
            $or: [
              { scenario_id: { $exists: false } },
              { scenario_id: null },
              { scenario_id: '' }
            ]
          }
        },
        {
          $group: {
            _id: '$asset_id',
            asset_id: { $first: '$asset_id' },
            totalCapex: { $sum: '$capex' },
            totalDebt: { $sum: '$debt_capex' },
            totalEquity: { $sum: '$equity_capex' },
            totalRevenue: { $sum: '$revenue' },
            totalOpex: { $sum: '$opex' },
            firstDate: { $min: '$date' },
            lastDate: { $max: '$date' },
            recordCount: { $sum: 1 }
          }
        },
        {
          $addFields: {
            asset_name: { $concat: ['Asset ', { $toString: '$asset_id' }] },
            name: { $concat: ['Asset ', { $toString: '$asset_id' }] },
            type: 'unknown',
            region: 'unknown',
            capacity: { $multiply: ['$totalCapex', 0.001] }, // Rough estimate: 1MW per $1M CAPEX
            OperatingStartDate: '$firstDate',
            cost_capex: '$totalCapex',
            cost_maxGearing: { 
              $cond: {
                if: { $gt: ['$totalCapex', 0] },
                then: { $divide: ['$totalDebt', '$totalCapex'] },
                else: 0
              }
            }
          }
        },
        {
          $sort: { asset_id: 1 }
        }
      ]
      
      const rawAssets = await cashFlowCollection.aggregate(assetsPipeline).toArray()
      
      assets = rawAssets.map(asset => ({
        asset_id: asset.asset_id,
        asset_name: asset.asset_name,
        name: asset.name,
        type: asset.type,
        region: asset.region,
        capacity: asset.capacity,
        OperatingStartDate: asset.OperatingStartDate,
        cost_capex: asset.cost_capex,
        cost_maxGearing: asset.cost_maxGearing,
        // Performance metrics from cash flows
        performance: {
          totalCapex: asset.totalCapex,
          totalDebt: asset.totalDebt,
          totalEquity: asset.totalEquity,
          totalRevenue: asset.totalRevenue,
          totalOpex: asset.totalOpex,
          recordCount: asset.recordCount,
          dateRange: {
            start: asset.firstDate,
            end: asset.lastDate
          }
        }
      }))
      
      console.log(`Created ${assets.length} asset summaries from cash flows collection`)
      
      return NextResponse.json({
        assets: assets,
        source: 'cash_flows_aggregated',
        count: assets.length
      })
      
    } catch (cashFlowError) {
      console.error('Could not aggregate from cash flows collection:', cashFlowError)
      
      // Final fallback: return empty array
      return NextResponse.json({
        assets: [],
        source: 'empty_fallback',
        count: 0,
        message: 'No asset data found in any collection'
      })
    }
    
  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const body = await request.json()
    const { asset } = body
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset data is required' },
        { status: 400 }
      )
    }
    
    // Add timestamps
    const now = new Date()
    asset.createdAt = now
    asset.updatedAt = now
    
    // Ensure asset_id is set
    if (!asset.asset_id) {
      // Get the next asset_id
      const inputsCollection = db.collection('ASSET_inputs_summary')
      const lastAsset = await inputsCollection.findOne({}, { sort: { asset_id: -1 } })
      asset.asset_id = (lastAsset?.asset_id || 0) + 1
    }
    
    // Insert into inputs summary collection
    const inputsCollection = db.collection('ASSET_inputs_summary')
    const result = await inputsCollection.insertOne(asset)
    
    return NextResponse.json({
      message: 'Asset created successfully',
      assetId: result.insertedId,
      asset: asset
    })
    
  } catch (error) {
    console.error('Asset creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const body = await request.json()
    const { assetId, asset } = body
    
    if (!assetId || !asset) {
      return NextResponse.json(
        { error: 'Asset ID and asset data are required' },
        { status: 400 }
      )
    }
    
    // Add update timestamp
    asset.updatedAt = new Date()
    
    // Update in inputs summary collection
    const inputsCollection = db.collection('ASSET_inputs_summary')
    const result = await inputsCollection.updateOne(
      { asset_id: parseInt(assetId) },
      { $set: asset }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'Asset updated successfully',
      modifiedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Asset update error:', error)
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    )
  }
}