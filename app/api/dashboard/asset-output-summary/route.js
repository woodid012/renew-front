// app/api/dashboard/asset-output-summary/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'
import { getPortfolioAssetIds } from '../../utils/portfolio-helper'

export async function GET(request) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Get portfolio parameter from query string
    const { searchParams } = new URL(request.url);
    const portfolio = searchParams.get('portfolio') || 'ZEBRE';
    
    // Get asset IDs for this portfolio
    const portfolioAssetIds = await getPortfolioAssetIds(db, portfolio);
    console.log(`Asset output summary - Portfolio: ${portfolio}, Asset IDs: [${portfolioAssetIds.join(', ')}]`);
    
    const collection = db.collection('ASSET_Output_Summary')
    
    // Filter assets by portfolio name first, then by portfolio asset IDs
    // This ensures we only get results for the specific portfolio
    let assets;
    const query = {
      portfolio: portfolio.trim()  // Filter by portfolio name
    };
    
    // Also filter by asset IDs if available (for additional safety)
    if (portfolioAssetIds.length > 0) {
      query.asset_id = { $in: portfolioAssetIds };
    }
    
    assets = await collection.find(query).toArray();
    
    if (assets.length === 0) {
      console.warn(`Asset output summary - No assets found for portfolio: ${portfolio} with query:`, query);
    } else {
      console.log(`Asset output summary - Found ${assets.length} assets for portfolio: ${portfolio}`);
    }
    
    if (assets.length === 0) {
      return NextResponse.json({
        assets: [],
        summary: {
          totalAssets: 0,
          totalCapacity: 0,
          totalCapex: 0,
          totalDebt: 0,
          totalEquity: 0,
          portfolioGearing: 0,
          avgIRR: 0,
          totalRevenue: 0,
          totalOpex: 0,
          totalCfads: 0,
          totalEquityCashFlow: 0
        },
        breakdown: {
          byType: {},
          byRegion: {}
        },
        portfolioData: null,
        message: 'No asset output summary found'
      })
    }
    
    // Find portfolio/platform entry (where asset_name is "Platform")
    const portfolioEntry = assets.find(asset => asset.asset_name === "Platform")
    
    // Filter out portfolio entry from individual assets
    const individualAssets = assets.filter(asset => asset.asset_name !== "Platform")
    
    // Calculate summary metrics from portfolio entry or sum of individual assets
    let summary
    if (portfolioEntry) {
      summary = {
        totalAssets: individualAssets.length,
        totalCapacity: 0, // Not available in this collection
        totalCapex: portfolioEntry.total_capex || 0,
        totalDebt: portfolioEntry.total_debt || 0,
        totalEquity: portfolioEntry.total_equity || 0,
        portfolioGearing: portfolioEntry.total_capex > 0 ? (portfolioEntry.total_debt / portfolioEntry.total_capex) : 0,
        avgIRR: portfolioEntry.equity_irr || 0,
        totalRevenue: portfolioEntry.total_revenue || 0,
        totalOpex: portfolioEntry.total_opex || 0,
        totalCfads: portfolioEntry.total_cfads || 0,
        totalEquityCashFlow: portfolioEntry.total_equity_cash_flow || 0
      }
    } else {
      // Fallback: calculate from individual assets
      const totalCapex = individualAssets.reduce((sum, asset) => sum + (asset.total_capex || 0), 0)
      const totalDebt = individualAssets.reduce((sum, asset) => sum + (asset.total_debt || 0), 0)
      const totalEquity = individualAssets.reduce((sum, asset) => sum + (asset.total_equity || 0), 0)
      const assetsWithIRR = individualAssets.filter(asset => asset.equity_irr && asset.equity_irr > 0)
      
      summary = {
        totalAssets: individualAssets.length,
        totalCapacity: 0,
        totalCapex: totalCapex,
        totalDebt: totalDebt,
        totalEquity: totalEquity,
        portfolioGearing: totalCapex > 0 ? (totalDebt / totalCapex) : 0,
        avgIRR: assetsWithIRR.length > 0 ? 
          assetsWithIRR.reduce((sum, asset) => sum + asset.equity_irr, 0) / assetsWithIRR.length : 0,
        totalRevenue: individualAssets.reduce((sum, asset) => sum + (asset.total_revenue || 0), 0),
        totalOpex: individualAssets.reduce((sum, asset) => sum + (asset.total_opex || 0), 0),
        totalCfads: individualAssets.reduce((sum, asset) => sum + (asset.total_cfads || 0), 0),
        totalEquityCashFlow: individualAssets.reduce((sum, asset) => sum + (asset.total_equity_cash_flow || 0), 0)
      }
    }
    
    // Process individual assets for the table
    const processedAssets = individualAssets.map(asset => ({
      asset_id: asset.asset_id,
      asset_name: asset.asset_name,
      construction_start_date: asset.construction_start_date,
      operations_start_date: asset.operations_start_date,
      operations_end_date: asset.operations_end_date,
      terminal_value: asset.terminal_value,
      total_capex: asset.total_capex,
      total_debt: asset.total_debt,
      total_equity: asset.total_equity,
      equity_irr: asset.equity_irr,
      total_revenue: asset.total_revenue,
      total_opex: asset.total_opex,
      total_cfads: asset.total_cfads,
      total_equity_cash_flow: asset.total_equity_cash_flow,
      gearing: asset.total_capex > 0 ? (asset.total_debt / asset.total_capex) : 0
    }))
    
    // Create breakdown by type and region (placeholder since not in this collection)
    const breakdown = {
      byType: {
        'renewable': individualAssets.length // Placeholder
      },
      byRegion: {
        'australia': individualAssets.length // Placeholder
      }
    }
    
    return NextResponse.json({
      assets: processedAssets,
      summary: summary,
      breakdown: breakdown,
      portfolioData: portfolioEntry,
      metadata: {
        source: 'ASSET_Output_Summary',
        totalRecords: assets.length,
        hasPortfolioEntry: !!portfolioEntry,
        individualAssets: individualAssets.length
      }
    })
    
  } catch (error) {
    console.error('Asset output summary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset output summary', details: error.message },
      { status: 500 }
    )
  }
}