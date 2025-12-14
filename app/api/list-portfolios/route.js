export const dynamic = 'force-dynamic';

// app/api/list-portfolios/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('renew_assets')
    
    // Get all portfolios from CONFIG_Inputs with details
    const portfolios = await db.collection('CONFIG_Inputs')
      .find({}, { 
        projection: { 
          PlatformName: 1, 
          PortfolioTitle: 1,
          unique_id: 1,
          asset_inputs: 1,
          updated_at: 1,
          _id: 0 
        } 
      })
      .toArray();
    
    // Group portfolios by unique_id
    const portfoliosByUniqueId = {};
    
    portfolios.forEach(p => {
      if (!p.unique_id) return; // Skip portfolios without unique_id
      
      const uniqueId = p.unique_id;
      
      if (!portfoliosByUniqueId[uniqueId]) {
        portfoliosByUniqueId[uniqueId] = {
          unique_id: uniqueId,
          portfolios: [], // Array of portfolio names/titles
          totalAssetCount: 0,
          lastUpdated: null
        };
      }
      
      // Add this portfolio's info
      const portfolioInfo = {
        name: p.PlatformName,
        title: p.PortfolioTitle || p.PlatformName
      };
      
      portfoliosByUniqueId[uniqueId].portfolios.push(portfolioInfo);
      portfoliosByUniqueId[uniqueId].totalAssetCount += (p.asset_inputs?.length || 0);
      
      // Keep the most recent updated_at
      if (p.updated_at) {
        const currentLastUpdated = portfoliosByUniqueId[uniqueId].lastUpdated;
        if (!currentLastUpdated || new Date(p.updated_at) > new Date(currentLastUpdated)) {
          portfoliosByUniqueId[uniqueId].lastUpdated = p.updated_at;
        }
      }
    });
    
    // Get default portfolio setting
    const defaultSettings = await db.collection('Settings').findOne({ 
      type: 'default_portfolio' 
    });
    const defaultUniqueId = defaultSettings?.value || null;
    
    // Convert to array and format for display
    const portfolioDetails = Object.values(portfoliosByUniqueId)
      .map(group => ({
        unique_id: group.unique_id,
        // Primary name/title (use first portfolio or one with a title)
        name: group.portfolios.find(p => p.title !== p.name)?.name || group.portfolios[0]?.name || group.unique_id,
        title: group.portfolios.find(p => p.title !== p.name)?.title || group.portfolios[0]?.title || group.unique_id,
        // All portfolio names and titles for this unique_id
        portfolioNames: group.portfolios.map(p => p.name),
        portfolioTitles: group.portfolios.map(p => ({ name: p.name, title: p.title })),
        assetCount: group.totalAssetCount,
        lastUpdated: group.lastUpdated,
        isDefault: group.unique_id === defaultUniqueId
      }))
      .sort((a, b) => {
        // Sort default portfolio first, then by unique_id
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        if (a.unique_id !== b.unique_id) {
          return a.unique_id.localeCompare(b.unique_id);
        }
        return a.name.localeCompare(b.name);
      });
    
    return NextResponse.json({ 
      success: true,
      portfolios: portfolioDetails,
      defaultPortfolio: defaultUniqueId
    });
  } catch (error) {
    console.error('Failed to list portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to list portfolios', 
      details: error.message 
    }, { status: 500 });
  }
}

