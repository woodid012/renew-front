// app/api/asset-inputs-summary/route.js
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
    
    // Transform the data to match frontend expectations
    const transformedAssets = assetInputs.map(asset => ({
      asset_id: asset.asset_id,
      asset_name: asset.asset_name || asset.name || `Asset ${asset.asset_id}`,
      type: asset.type || 'unknown',
      region: asset.region || 'unknown',
      capacity: parseFloat(asset.capacity) || 0,
      
      // Financial parameters
      cost_capex: parseFloat(asset.cost_capex) || 0,
      cost_max_gearing: parseFloat(asset.cost_maxGearing) || 0,
      cost_interest_rate: parseFloat(asset.cost_interestRate) || 0,
      cost_tenor_years: parseFloat(asset.cost_tenorYears) || 0,
      cost_terminal_value: parseFloat(asset.cost_terminalValue) || 0,
      cost_operating_costs: parseFloat(asset.cost_operatingCosts) || 0,
      cost_operating_cost_escalation: parseFloat(asset.cost_operatingCostEscalation) || 0,
      
      // Operational parameters
      capacity_factor: parseFloat(asset.capacityFactor) || 0,
      annual_degradation: parseFloat(asset.annualDegradation) || 0,
      volume_loss_adjustment: parseFloat(asset.volumeLossAdjustment) || 95,
      asset_life: parseInt(asset.assetLife) || 25,
      
      // Dates
      construction_start_date: asset.constructionStartDate,
      operating_start_date: asset.OperatingStartDate,
      
      // Debt sizing results
      debt_total_capex: parseFloat(asset.debt_total_capex) || 0,
      debt_amount: parseFloat(asset.debt_amount) || 0,
      debt_equity_amount: parseFloat(asset.debt_equity_amount) || 0,
      debt_gearing: parseFloat(asset.debt_gearing) || 0,
      
      // Performance metrics
      equity_irr: parseFloat(asset['Equity IRR']) || null,
      
      // Contracts
      contracts: asset.contracts || [],
      
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