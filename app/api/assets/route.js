// app/api/assets/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Try to get assets from inputs summary first (preferred source)
    let assets = []
    
    try {
      const inputsCollection = db.collection('ASSET_inputs_summary')
      assets = await inputsCollection.find({}).toArray()
      
      console.log(`Found ${assets.length} assets in inputs summary collection`)
      
      if (assets.length > 0) {
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
      
      // Aggregate unique asset information from cash flows
      const assetsPipeline = [
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
      
      assets = await cashFlowCollection.aggregate(assetsPipeline).toArray()
      
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