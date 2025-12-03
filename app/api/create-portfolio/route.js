export const dynamic = 'force-dynamic';

// app/api/create-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request) {
  try {
    const { portfolio } = await request.json();
    
    if (!portfolio || !portfolio.trim()) {
      return NextResponse.json({ error: 'Portfolio name is required' }, { status: 400 });
    }
    
    const portfolioName = portfolio.trim();
    const client = await clientPromise
    const db = client.db('renew_assets')
    
    // Check if portfolio already exists
    const existing = await db.collection('CONFIG_Inputs').findOne({ 
      PlatformName: portfolioName 
    });
    
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Portfolio already exists',
        _id: existing._id.toString(),
        portfolio: portfolioName
      });
    }
    
    // Create new portfolio document
    const newPortfolioDoc = {
      PlatformName: portfolioName,
      PlatformID: 1,
      asset_inputs: [],
      platformInputs: null
    };
    
    const insertResult = await db.collection('CONFIG_Inputs').insertOne(newPortfolioDoc);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Portfolio created successfully',
      _id: insertResult.insertedId.toString(),
      portfolio: portfolioName
    });
  } catch (error) {
    console.error('Failed to create portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to create portfolio', 
      details: error.message 
    }, { status: 500 });
  }
}



