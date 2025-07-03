// app/api/scenarios/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'base', 'sensitivity', 'all'
    
    // Get base case scenarios from main collection
    const mainCollection = db.collection('ASSET_cash_flows')
    const sensCollection = db.collection('SENS_Asset_Outputs')
    
    let scenarios = []
    
    if (type === 'all' || type === 'base') {
      // Get base case scenarios
      const baseScenarios = await mainCollection.distinct('scenario_id')
      
      for (let scenarioId of baseScenarios) {
        const scenarioStats = await mainCollection.aggregate([
          { $match: { scenario_id: scenarioId } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$revenue' },
              totalCapex: { $sum: '$capex' },
              totalEquityCashFlow: { $sum: '$equity_cash_flow' },
              recordCount: { $sum: 1 },
              minDate: { $min: '$date' },
              maxDate: { $max: '$date' },
              uniqueAssets: { $addToSet: '$asset_id' }
            }
          }
        ]).toArray()
        
        const stats = scenarioStats[0] || {}
        
        scenarios.push({
          scenarioId: scenarioId || 'base_case',
          name: scenarioId || 'Base Case',
          type: 'base',
          description: 'Base case financial model',
          stats: {
            totalRevenue: stats.totalRevenue || 0,
            totalCapex: stats.totalCapex || 0,
            totalEquityCashFlow: stats.totalEquityCashFlow || 0,
            recordCount: stats.recordCount || 0,
            assetCount: stats.uniqueAssets?.length || 0,
            dateRange: {
              start: stats.minDate,
              end: stats.maxDate
            }
          }
        })
      }
    }
    
    if (type === 'all' || type === 'sensitivity') {
      // Get sensitivity scenarios
      const sensitivityScenarios = await sensCollection.distinct('scenario_id')
      
      for (let scenarioId of sensitivityScenarios) {
        const scenarioStats = await sensCollection.aggregate([
          { $match: { scenario_id: scenarioId } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$revenue' },
              totalCapex: { $sum: '$capex' },
              totalEquityCashFlow: { $sum: '$equity_cash_flow' },
              recordCount: { $sum: 1 },
              minDate: { $min: '$date' },
              maxDate: { $max: '$date' },
              uniqueAssets: { $addToSet: '$asset_id' }
            }
          }
        ]).toArray()
        
        const stats = scenarioStats[0] || {}
        
        // Parse scenario parameters from scenario_id
        const scenarioParams = parseScenarioId(scenarioId)
        
        scenarios.push({
          scenarioId: scenarioId,
          name: scenarioParams.name,
          type: 'sensitivity',
          parameter: scenarioParams.parameter,
          value: scenarioParams.value,
          description: scenarioParams.description,
          stats: {
            totalRevenue: stats.totalRevenue || 0,
            totalCapex: stats.totalCapex || 0,
            totalEquityCashFlow: stats.totalEquityCashFlow || 0,
            recordCount: stats.recordCount || 0,
            assetCount: stats.uniqueAssets?.length || 0,
            dateRange: {
              start: stats.minDate,
              end: stats.maxDate
            }
          }
        })
      }
    }
    
    // Sort scenarios
    scenarios.sort((a, b) => {
      if (a.type === 'base' && b.type === 'sensitivity') return -1
      if (a.type === 'sensitivity' && b.type === 'base') return 1
      return a.name.localeCompare(b.name)
    })
    
    return NextResponse.json({
      scenarios: scenarios,
      count: scenarios.length,
      types: {
        base: scenarios.filter(s => s.type === 'base').length,
        sensitivity: scenarios.filter(s => s.type === 'sensitivity').length
      }
    })
    
  } catch (error) {
    console.error('Scenarios API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scenarios', details: error.message },
      { status: 500 }
    )
  }
}

function parseScenarioId(scenarioId) {
  // Parse scenario IDs like "sensitivity_results_electricity_price_-5.0000"
  if (!scenarioId || !scenarioId.startsWith('sensitivity_results_')) {
    return {
      name: scenarioId || 'Unknown Scenario',
      parameter: 'unknown',
      value: null,
      description: 'Unknown scenario'
    }
  }
  
  const parts = scenarioId.split('_')
  
  if (parts.length >= 4) {
    // Handle multi-word parameters like 'electricity_price'
    const paramParts = parts.slice(2, -1)  // Everything except prefix and last value
    const valuePart = parts[parts.length - 1]
    
    const parameter = paramParts.join('_')
    
    try {
      const value = parseFloat(valuePart)
      
      const parameterDisplayNames = {
        'electricity_price': 'Electricity Price',
        'green_price': 'Green Certificate Price',
        'volume': 'Generation Volume',
        'capex': 'CAPEX',
        'opex': 'OPEX',
        'interest_rate': 'Interest Rate',
        'terminal_value': 'Terminal Value'
      }
      
      const displayName = parameterDisplayNames[parameter] || parameter.replace(/_/g, ' ')
      
      let description = `${displayName} scenario`
      if (value > 0) {
        description += ` (+${value})`
      } else if (value < 0) {
        description += ` (${value})`
      }
      
      return {
        name: `${displayName} ${value > 0 ? '+' : ''}${value}`,
        parameter: parameter,
        value: value,
        description: description
      }
    } catch {
      // Value parsing failed
    }
  }
  
  return {
    name: scenarioId.replace(/^sensitivity_results_/, '').replace(/_/g, ' '),
    parameter: 'unknown',
    value: null,
    description: 'Sensitivity scenario'
  }
}