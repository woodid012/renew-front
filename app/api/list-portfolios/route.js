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
        portfolios: ['ZEBRE', 'xxx'],
        warning: 'MongoDB connection failed, returning default portfolios'
      });
    }
    
    const db = client.db('renew_assets')
    
    // Get all portfolios from CONFIG_Inputs
    const portfolios = await db.collection('CONFIG_Inputs')
      .find({}, { projection: { PlatformName: 1, _id: 0 } })
      .toArray();
    
    // Extract portfolio names
    const portfolioNames = portfolios
      .map(p => p.PlatformName)
      .filter(name => name) // Filter out null/undefined
      .sort();
    
    // Always include default portfolios
    const allPortfolios = ['ZEBRE', 'xxx', ...portfolioNames.filter(p => p !== 'ZEBRE' && p !== 'xxx')];
    
    return NextResponse.json({ 
      success: true,
      portfolios: allPortfolios
    });
  } catch (error) {
    console.error('Failed to list portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to list portfolios', 
      details: error.message 
    }, { status: 500 });
  }
}

