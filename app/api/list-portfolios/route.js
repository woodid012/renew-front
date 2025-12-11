export const dynamic = 'force-dynamic';

// app/api/list-portfolios/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    let client;
    try {
      client = await clientPromise;
    } catch (mongoError) {
      console.error('MongoDB connection error:', mongoError);
      // Return default portfolios if MongoDB is not available
      return NextResponse.json({ 
        success: true,
        portfolios: [
          { name: 'ZEBRE', title: 'ZEBRE', unique_id: 'ZEBRE', assetCount: 0, lastUpdated: null },
          { name: 'xxx', title: 'xxx', unique_id: 'xxx', assetCount: 0, lastUpdated: null }
        ],
        warning: 'MongoDB connection failed, returning default portfolios'
      });
    }
    
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
    
    // Build portfolio details array
    const portfolioDetails = portfolios
      .map(p => ({
        name: p.PlatformName, // Keep PlatformName as identifier
        title: p.PortfolioTitle || p.PlatformName, // Use PortfolioTitle if exists, fallback to PlatformName
        unique_id: p.unique_id, // Use unique_id if exists, otherwise undefined
        assetCount: p.asset_inputs?.length || 0,
        lastUpdated: p.updated_at || null
      }))
      .filter(p => p.name) // Filter out null/undefined names
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Always include default portfolios (with placeholder data if not in DB)
    const defaultPortfolios = ['ZEBRE', 'xxx'];
    const existingDefaultPortfolios = portfolioDetails.filter(p => defaultPortfolios.includes(p.name));
    const missingDefaults = defaultPortfolios.filter(name => !portfolioDetails.find(p => p.name === name));
    
    // Add missing defaults with placeholder data
    missingDefaults.forEach(name => {
      portfolioDetails.unshift({
        name: name,
        title: name, // Default title to name
        unique_id: name, // Default unique_id to name
        assetCount: 0,
        lastUpdated: null
      });
    });
    
    // Ensure defaults are at the top
    const sortedPortfolios = [
      ...portfolioDetails.filter(p => defaultPortfolios.includes(p.name)),
      ...portfolioDetails.filter(p => !defaultPortfolios.includes(p.name))
    ];
    
    return NextResponse.json({ 
      success: true,
      portfolios: sortedPortfolios
    });
  } catch (error) {
    console.error('Failed to list portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to list portfolios', 
      details: error.message 
    }, { status: 500 });
  }
}

