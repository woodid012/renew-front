// app/api/asset-input-summary/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Try to get asset inputs from the inputs summary collection
    const inputsCollection = db.collection('ASSET_inputs_summary')
    const assetInputs = await inputsCollection.find({}).toArray()
    
    if (assetInputs.length === 0) {
      return NextResponse.json({
        assets: [],
        message: 'No asset inputs found in ASSET_inputs_summary collection'
      })
    }
    
    // Transform the data to match frontend expectations - using your actual field names
    const transformedAssets = assetInputs.map(asset => ({
      // Basic asset info
      asset_id: asset.asset_id,
      asset_name: asset.asset_name || asset.name || `Asset ${asset.asset_id}`,
      type: asset.type || 'unknown',
      region: asset.region || 'unknown',
      capacity: parseFloat(asset.capacity) || 0,
      volume: parseFloat(asset.volume) || 0,
      
      // Financial parameters - using your exact field names
      cost_capex: parseFloat(asset.cost_capex) || 0,
      cost_maxGearing: parseFloat(asset.cost_maxGearing) || 0,
      cost_interestRate: parseFloat(asset.cost_interestRate) || 0,
      cost_tenorYears: parseFloat(asset.cost_tenorYears) || 0,
      cost_terminalValue: parseFloat(asset.cost_terminalValue) || 0,
      cost_operatingCosts: parseFloat(asset.cost_operatingCosts) || 0,
      cost_operatingCostEscalation: parseFloat(asset.cost_operatingCostEscalation) || 0,
      cost_targetDSCRContract: parseFloat(asset.cost_targetDSCRContract) || 0,
      cost_targetDSCRMerchant: parseFloat(asset.cost_targetDSCRMerchant) || 0,
      cost_calculatedGearing: parseFloat(asset.cost_calculatedGearing) || 0,
      cost_debtStructure: asset.cost_debtStructure || '',
      
      // Operational parameters - using your exact field names
      capacityFactor: asset.capacityFactor || '',
      qtrCapacityFactor_q1: asset.qtrCapacityFactor_q1 || '',
      qtrCapacityFactor_q2: asset.qtrCapacityFactor_q2 || '',
      qtrCapacityFactor_q3: asset.qtrCapacityFactor_q3 || '',
      qtrCapacityFactor_q4: asset.qtrCapacityFactor_q4 || '',
      annualDegradation: parseFloat(asset.annualDegradation) || 0,
      volumeLossAdjustment: parseFloat(asset.volumeLossAdjustment) || 95,
      assetLife: parseInt(asset.assetLife) || 25,
      constructionDuration: parseInt(asset.constructionDuration) || 0,
      
      // Dates
      constructionStartDate: asset.constructionStartDate,
      OperatingStartDate: asset.OperatingStartDate,
      
      // Debt sizing results - using your exact field names
      debt_total_capex: parseFloat(asset.debt_total_capex) || 0,
      debt_debt_amount: parseFloat(asset.debt_debt_amount) || 0,
      debt_equity_amount: parseFloat(asset.debt_equity_amount) || 0,
      debt_gearing: parseFloat(asset.debt_gearing) || 0,
      
      // Performance metrics
      equity_irr: parseFloat(asset['Equity IRR']) || null,
      
      // Contracts - keep as string for parsing in frontend
      contracts: asset.contracts || '',
      
      // Timestamps
      created_at: asset.createdAt,
      updated_at: asset.updatedAt
    }))
    
    return NextResponse.json({
      assets: transformedAssets,
      count: transformedAssets.length,
      source: 'ASSET_inputs_summary'
    })
    
  } catch (error) {
    console.error('Asset inputs summary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset inputs summary', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const body = await request.json()
    const { assets } = body
    
    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json(
        { error: 'Assets array is required' },
        { status: 400 }
      )
    }
    
    const inputsCollection = db.collection('ASSET_inputs_summary')
    const results = []
    
    // Update each asset
    for (const asset of assets) {
      if (!asset.asset_id) {
        continue
      }
      
      // Add update timestamp
      asset.updatedAt = new Date()
      
      const result = await inputsCollection.replaceOne(
        { asset_id: asset.asset_id },
        asset,
        { upsert: true }
      )
      
      results.push({
        asset_id: asset.asset_id,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    }
    
    return NextResponse.json({
      message: 'Assets updated successfully',
      results: results,
      totalUpdated: results.length
    })
    
  } catch (error) {
    console.error('Asset update error:', error)
    return NextResponse.json(
      { error: 'Failed to update assets', details: error.message },
      { status: 500 }
    )
  }
}