export const dynamic = 'force-dynamic';

// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let portfolio = searchParams.get('portfolio') || 'ZEBRE';
    
    // Normalize portfolio name (trim whitespace)
    portfolio = portfolio.trim();
    
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
    
    // Try to find config by PlatformName matching the portfolio exactly
    // Use exact string match to ensure we get the right portfolio
    let configDoc = await db.collection('CONFIG_Inputs').findOne({ 
      PlatformName: portfolio 
    });
    
    // If not found, create a new empty document for this portfolio
    if (!configDoc) {
      console.log(`Creating new portfolio document for: ${portfolio}`);
      const newPortfolioDoc = {
        PlatformName: portfolio,
        PlatformID: 1,
        asset_inputs: [],
        platformInputs: null
      };
      
      const insertResult = await db.collection('CONFIG_Inputs').insertOne(newPortfolioDoc);
      configDoc = { 
        ...newPortfolioDoc, 
        _id: insertResult.insertedId.toString() // Convert ObjectId to string
      };
      console.log(`Created new portfolio document with _id: ${configDoc._id}`);
    } else {
      console.log(`Found existing portfolio document for: ${portfolio} with _id: ${configDoc._id}`);
    }

    // Ensure PlatformName matches the requested portfolio
    if (configDoc.PlatformName !== portfolio) {
      configDoc.PlatformName = portfolio;
    }

    // Ensure asset_inputs exists
    if (!configDoc.asset_inputs) {
      configDoc.asset_inputs = [];
    }

    // Convert _id to string if it's an ObjectId
    const responseData = {
      ...configDoc,
      _id: configDoc._id ? configDoc._id.toString() : configDoc._id
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch asset data', details: error.message }, { status: 500 })
  }
}