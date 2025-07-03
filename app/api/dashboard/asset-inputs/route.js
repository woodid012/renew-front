// app/api/dashboard/asset-inputs/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Try multiple collection names in order of preference
    const possibleCollections = [
      'ASSET_inputs_summary',  // Expected collection
      'asset_inputs_summary',  // Lowercase variant
      'asset_inputs'           // Alternative collection
    ]
    
    let assetInputs = []
    let sourceCollection = null
    
    for (const collectionName of possibleCollections) {
      try {
        const collection = db.collection(collectionName)
        const count = await collection.countDocuments()
        
        if (count > 0) {
          console.log(`Found ${count} documents in ${collectionName}`)
          assetInputs = await collection.find({}).toArray()
          sourceCollection = collectionName
          break
        }
      } catch (e) {
        console.log(`Could not check collection ${collectionName}:`, e.message)
      }
    }
    
    if (assetInputs.length === 0) {
      return NextResponse.json({
        assets: [],
        summary: {
          totalAssets: 0,
          totalCapacity: 0,
          totalCapex: 0,
          totalDebt: 0,
          totalEquity: 0,
          avgGearing: 0,
          avgIRR: 0
        },
        breakdown: {
          byType: {},
          byRegion: {},
          byFinancing: {}
        },
        source: 'no_data_found',
        searchedCollections: possibleCollections
      })
    }
    
    console.log(`Using data from ${sourceCollection}, sample document:`, Object.keys(assetInputs[0]))
    
    // Transform and enhance the data - handle different field name variations
    const processedAssets = assetInputs.map(asset => {
      // Handle different possible field names
      const getId = () => asset.asset_id || asset.id || asset.assetId
      const getName = () => asset.asset_name || asset.name || asset.assetName || `Asset ${getId()}`
      const getType = () => asset.type || asset.assetType || 'unknown'
      const getRegion = () => asset.region || asset.assetRegion || 'unknown'
      const getCapacity = () => parseFloat(asset.capacity || asset.assetCapacity || 0)
      
      return {
        // Basic asset info
        asset_id: getId(),
        asset_name: getName(),
        type: getType(),
        region: getRegion(),
        
        // Technical specifications
        capacity: getCapacity(),
        capacity_factor: parseFloat(asset.capacityFactor || asset.capacity_factor || asset.capacityFactor || 0),
        annual_degradation: parseFloat(asset.annualDegradation || asset.annual_degradation || asset.degradation || 0),
        volume_loss_adjustment: parseFloat(asset.volumeLossAdjustment || asset.volume_loss_adjustment || asset.volumeLoss || 95),
        asset_life: parseInt(asset.assetLife || asset.asset_life || asset.life || 25),
        
        // Dates
        construction_start_date: asset.constructionStartDate || asset.construction_start_date || asset.constructionStart,
        operating_start_date: asset.OperatingStartDate || asset.operating_start_date || asset.operatingStart || asset.assetStartDate,
        
        // Financial assumptions - try multiple field name patterns
        cost_capex: parseFloat(asset.cost_capex || asset.capex || asset.totalCapex || asset.CAPEX || 0),
        cost_max_gearing: parseFloat(asset.cost_maxGearing || asset.maxGearing || asset.max_gearing || asset.gearing || 0),
        cost_interest_rate: parseFloat(asset.cost_interestRate || asset.interestRate || asset.interest_rate || asset.debtInterestRate || 0),
        cost_tenor_years: parseFloat(asset.cost_tenorYears || asset.tenorYears || asset.tenor || asset.debtTenor || 0),
        cost_terminal_value: parseFloat(asset.cost_terminalValue || asset.terminalValue || asset.terminal_value || 0),
        cost_operating_costs: parseFloat(asset.cost_operatingCosts || asset.operatingCosts || asset.opex || asset.OPEX || 0),
        cost_operating_cost_escalation: parseFloat(asset.cost_operatingCostEscalation || asset.operatingCostEscalation || asset.opexEscalation || 0),
        
        // Debt sizing results (if available)
        debt_total_capex: parseFloat(asset.debt_total_capex || asset.totalCapex || 0),
        debt_amount: parseFloat(asset.debt_amount || asset.debtAmount || asset.totalDebt || 0),
        debt_equity_amount: parseFloat(asset.debt_equity_amount || asset.equityAmount || asset.totalEquity || 0),
        debt_gearing: parseFloat(asset.debt_gearing || asset.actualGearing || asset.finalGearing || 0),
        
        // Performance targets
        target_dscr_contract: parseFloat(asset.cost_targetDSCRContract || asset.targetDSCRContract || asset.contractDSCR || 0),
        target_dscr_merchant: parseFloat(asset.cost_targetDSCRMerchant || asset.targetDSCRMerchant || asset.merchantDSCR || 0),
        
        // Contract information
        contracts: asset.contracts || [],
        
        // IRR if calculated
        equity_irr: parseFloat(asset['Equity IRR'] || asset.equityIRR || asset.irr || asset.IRR) || null,
        
        // Timestamps
        created_at: asset.createdAt || asset.created_at,
        updated_at: asset.updatedAt || asset.updated_at,
        
        // Include all original fields for debugging
        _originalFields: Object.keys(asset)
      }
    })
    
    // Calculate portfolio summary metrics
    const totalAssets = processedAssets.length
    const totalCapacity = processedAssets.reduce((sum, asset) => sum + asset.capacity, 0)
    const totalCapex = processedAssets.reduce((sum, asset) => sum + asset.cost_capex, 0)
    const totalDebt = processedAssets.reduce((sum, asset) => sum + asset.debt_amount, 0)
    const totalEquity = processedAssets.reduce((sum, asset) => sum + asset.debt_equity_amount, 0)
    
    // Calculate averages (excluding zero values)
    const assetsWithGearing = processedAssets.filter(asset => asset.debt_gearing > 0)
    const avgGearing = assetsWithGearing.length > 0 
      ? assetsWithGearing.reduce((sum, asset) => sum + asset.debt_gearing, 0) / assetsWithGearing.length 
      : 0
    
    const assetsWithIRR = processedAssets.filter(asset => asset.equity_irr !== null && asset.equity_irr > 0)
    const avgIRR = assetsWithIRR.length > 0 
      ? assetsWithIRR.reduce((sum, asset) => sum + asset.equity_irr, 0) / assetsWithIRR.length 
      : 0
    
    // Create breakdowns
    const byType = processedAssets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1
      return acc
    }, {})
    
    const byRegion = processedAssets.reduce((acc, asset) => {
      acc[asset.region] = (acc[asset.region] || 0) + 1
      return acc
    }, {})
    
    const byFinancing = processedAssets.reduce((acc, asset) => {
      if (asset.debt_gearing > 0.7) {
        acc['High Gearing (>70%)'] = (acc['High Gearing (>70%)'] || 0) + 1
      } else if (asset.debt_gearing > 0.3) {
        acc['Medium Gearing (30-70%)'] = (acc['Medium Gearing (30-70%)'] || 0) + 1
      } else if (asset.debt_gearing > 0) {
        acc['Low Gearing (<30%)'] = (acc['Low Gearing (<30%)'] || 0) + 1
      } else {
        acc['100% Equity'] = (acc['100% Equity'] || 0) + 1
      }
      return acc
    }, {})
    
    // Calculate capacity and CAPEX by type
    const capacityByType = processedAssets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.capacity
      return acc
    }, {})
    
    const capexByType = processedAssets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.cost_capex
      return acc
    }, {})
    
    return NextResponse.json({
      assets: processedAssets,
      summary: {
        totalAssets,
        totalCapacity,
        totalCapex,
        totalDebt,
        totalEquity,
        avgGearing,
        avgIRR,
        portfolioGearing: totalCapex > 0 ? totalDebt / totalCapex : 0
      },
      breakdown: {
        byType,
        byRegion,
        byFinancing,
        capacityByType,
        capexByType
      },
      metadata: {
        source: sourceCollection,
        assetCount: totalAssets,
        hasIRRData: assetsWithIRR.length > 0,
        hasDebtData: assetsWithGearing.length > 0,
        lastUpdated: new Date().toISOString(),
        searchedCollections: possibleCollections,
        rawSampleDocument: assetInputs[0] // Include first raw document for debugging
      }
    })
    
  } catch (error) {
    console.error('Asset inputs summary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset inputs summary', details: error.message },
      { status: 500 }
    )
  }
}