// app/api/dashboard/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'
import { getPortfolioAssetIds } from '../utils/portfolio-helper'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uniqueId = searchParams.get('unique_id');
    
    if (!uniqueId) {
      return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
    }
    
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get asset IDs for this portfolio
    const portfolioAssetIds = await getPortfolioAssetIds(db, uniqueId);
    
    // Get collections
    const cashFlowCollection = db.collection('ASSET_cash_flows')
    const inputsCollection = db.collection('ASSET_inputs_summary')
    
    // 1. Portfolio CAPEX/Debt/Equity metrics from cash flows
    const capexPipeline = [
      // Always filter by portfolio asset IDs
      { $match: { asset_id: { $in: portfolioAssetIds } } },
      {
        $group: {
          _id: null,
          totalCapex: { $sum: '$capex' },
          totalDebt: { $sum: '$debt_capex' },
          totalEquity: { $sum: '$equity_capex' }
        }
      }
    ]
    
    // 2. Revenue/OPEX metrics from cash flows
    const revenuePipeline = [
      // Always filter by portfolio asset IDs
      { $match: { asset_id: { $in: portfolioAssetIds } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          totalOpex: { $sum: '$opex' },
          totalEquityCashFlow: { $sum: '$equity_cash_flow' },
          totalCfads: { $sum: '$cfads' }
        }
      }
    ]
    
    // 3. Asset count from cash flows
    const assetCountPipeline = [
      // Always filter by portfolio asset IDs
      { $match: { asset_id: { $in: portfolioAssetIds } } },
      { $group: { _id: '$asset_id' } },
      { $count: 'totalAssets' }
    ]
    
    // 4. Asset type/region breakdown from inputs if available
    // Note: ASSET_inputs_summary may not have asset_id, so we'll filter by matching names from CONFIG_Inputs
    const { getPortfolioConfig } = await import('../utils/portfolio-helper');
    const portfolioConfig = await getPortfolioConfig(db, uniqueId);
    const portfolioAssetNames = portfolioConfig && portfolioConfig.asset_inputs 
      ? portfolioConfig.asset_inputs.map(a => a.name).filter(Boolean)
      : [];
    
    const assetTypesPipeline = [
      // Filter by asset names if we have them
      ...(portfolioAssetNames.length > 0 ? [{ $match: { asset_name: { $in: portfolioAssetNames } } }] : []),
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]
    
    const assetRegionsPipeline = [
      // Filter by asset names if we have them
      ...(portfolioAssetNames.length > 0 ? [{ $match: { asset_name: { $in: portfolioAssetNames } } }] : []),
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 }
        }
      }
    ]
    
    // 5. Total capacity from inputs if available
    const capacityPipeline = [
      // Filter by asset names if we have them
      ...(portfolioAssetNames.length > 0 ? [{ $match: { asset_name: { $in: portfolioAssetNames } } }] : []),
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: { $toDouble: '$capacity' } }
        }
      }
    ]
    
    // Execute all pipelines
    const [
      capexResult,
      revenueResult,
      assetCountResult,
      assetTypesResult,
      assetRegionsResult,
      capacityResult
    ] = await Promise.all([
      cashFlowCollection.aggregate(capexPipeline).toArray(),
      cashFlowCollection.aggregate(revenuePipeline).toArray(),
      cashFlowCollection.aggregate(assetCountPipeline).toArray(),
      inputsCollection.aggregate(assetTypesPipeline).toArray(),
      inputsCollection.aggregate(assetRegionsPipeline).toArray(),
      inputsCollection.aggregate(capacityPipeline).toArray()
    ])
    
    // Process results
    const capexData = capexResult[0] || { totalCapex: 0, totalDebt: 0, totalEquity: 0 }
    const revenueData = revenueResult[0] || { totalRevenue: 0, totalOpex: 0, totalEquityCashFlow: 0, totalCfads: 0 }
    const assetCountData = assetCountResult[0] || { totalAssets: 0 }
    const capacityData = capacityResult[0] || { totalCapacity: 0 }
    
    // Process asset types and regions
    const byType = {}
    assetTypesResult.forEach(item => {
      if (item._id) {
        byType[item._id] = item.count
      }
    })
    
    const byRegion = {}
    assetRegionsResult.forEach(item => {
      if (item._id) {
        byRegion[item._id] = item.count
      }
    })
    
    // Calculate gearing
    const gearing = capexData.totalCapex > 0 ? capexData.totalDebt / capexData.totalCapex : 0
    
    // Try to get IRR from inputs summary (if available)
    let irr = 0
    try {
      const irrResult = await inputsCollection.findOne(
        { 'Equity IRR': { $exists: true } },
        { 
          sort: { _id: -1 }, 
          projection: { 'Equity IRR': 1, irr: 1 } 
        }
      )
      
      if (irrResult) {
        irr = irrResult['Equity IRR'] || irrResult.irr || 0
      }
    } catch (irrError) {
      console.warn('Could not fetch IRR from inputs collection:', irrError)
    }
    
    // If we don't have capacity from inputs, estimate from asset count
    let totalCapacity = capacityData.totalCapacity
    if (totalCapacity === 0 && assetCountData.totalAssets > 0) {
      // Rough estimate: 100MW per asset as fallback
      totalCapacity = assetCountData.totalAssets * 100
    }
    
    // Calculate some additional metrics
    const avgRevenuePerAsset = assetCountData.totalAssets > 0 ? revenueData.totalRevenue / assetCountData.totalAssets : 0
    const avgCapexPerAsset = assetCountData.totalAssets > 0 ? capexData.totalCapex / assetCountData.totalAssets : 0
    
    const dashboardData = {
      // Portfolio financial metrics
      totalCapex: capexData.totalCapex,
      totalDebt: capexData.totalDebt,
      totalEquity: capexData.totalEquity,
      gearing: gearing,
      
      // Revenue and operational metrics
      totalAnnualRevenue: revenueData.totalRevenue,
      totalAnnualOpex: revenueData.totalOpex,
      totalAnnualCashFlow: revenueData.totalEquityCashFlow,
      totalCfads: revenueData.totalCfads,
      
      // Asset metrics
      totalAssets: assetCountData.totalAssets,
      totalCapacity: totalCapacity,
      
      // Performance metrics
      irr: irr,
      avgRevenuePerAsset: avgRevenuePerAsset,
      avgCapexPerAsset: avgCapexPerAsset,
      
      // Breakdowns
      byType: byType,
      byRegion: byRegion,
      
      // Metadata
      dataSource: {
        cashFlows: cashFlowCollection.collectionName,
        inputs: inputsCollection.collectionName,
        hasIRR: irr > 0,
        hasCapacityData: capacityData.totalCapacity > 0
      }
    }

    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    )
  }
}