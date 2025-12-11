export const dynamic = 'force-dynamic';

// app/api/get-portfolio-unique-id/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolio = searchParams.get('portfolio');
    
    if (!portfolio) {
      return NextResponse.json({ error: 'portfolio parameter is required' }, { status: 400 });
    }
    
    let client;
    try {
      client = await clientPromise;
    } catch (mongoError) {
      console.error('MongoDB connection error:', mongoError);
      return NextResponse.json({ 
        error: 'MongoDB connection failed', 
        details: mongoError.message,
        hint: 'Please check your MONGODB_URI environment variable in .env.local'
      }, { status: 500 });
    }
    
    const db = client.db('renew_assets')
    const portfolioName = portfolio.trim();
    
    // Try to find by unique_id first (since selectedPortfolio is often a unique_id)
    let configDoc = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: portfolioName 
    });
    
    // If not found, try PlatformName
    if (!configDoc) {
      configDoc = await db.collection('CONFIG_Inputs').findOne({ 
        PlatformName: portfolioName 
      });
    }
    
    // If not found, try PortfolioTitle
    if (!configDoc) {
      configDoc = await db.collection('CONFIG_Inputs').findOne({ 
        PortfolioTitle: portfolioName 
      });
    }
    
    if (!configDoc) {
      return NextResponse.json({ 
        error: 'Portfolio not found',
        portfolio: portfolioName
      }, { status: 404 });
    }
    
    // Return the unique_id (or PlatformName as fallback if unique_id doesn't exist)
    const uniqueId = configDoc.unique_id || configDoc.PlatformName;
    
    return NextResponse.json({ 
      portfolio: portfolioName,
      unique_id: uniqueId
    });
  } catch (error) {
    console.error('Failed to get portfolio unique_id:', error);
    return NextResponse.json({ error: 'Failed to get portfolio unique_id', details: error.message }, { status: 500 })
  }
}

