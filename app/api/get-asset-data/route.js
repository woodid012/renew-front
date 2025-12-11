export const dynamic = 'force-dynamic';

// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uniqueId = searchParams.get('unique_id');
    
    if (!uniqueId) {
      return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
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
    
    // Find config by unique_id
    const { getPortfolioConfig } = await import('../utils/portfolio-helper');
    let configDoc = await getPortfolioConfig(db, uniqueId);
    
    // If not found, return error (don't create new portfolios here - use create-portfolio API)
    if (!configDoc) {
      console.log(`No portfolio document found for unique_id: ${uniqueId}`);
      return NextResponse.json({ 
        error: 'Portfolio not found for the provided unique_id',
        unique_id: uniqueId
      }, { status: 404 });
    }
    
    console.log(`Found existing portfolio document for unique_id: ${uniqueId} with _id: ${configDoc._id}`);

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