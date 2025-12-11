export const dynamic = 'force-dynamic';

// app/api/create-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { nanoid } from 'nanoid'

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
    
    // Generate a unique_id using nanoid
    // Ensure uniqueness by checking if the generated ID already exists (retry if needed)
    let uniqueId;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      uniqueId = nanoid();
      const existingWithId = await db.collection('CONFIG_Inputs').findOne({ 
        unique_id: uniqueId 
      });
      
      if (!existingWithId) {
        break; // Found a unique ID
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique portfolio ID after multiple attempts');
      }
    } while (true);
    
    // Create new portfolio document
    const newPortfolioDoc = {
      PlatformName: portfolioName,
      PortfolioTitle: portfolioName, // Set PortfolioTitle = PlatformName by default
      PlatformID: 1,
      unique_id: uniqueId,
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



