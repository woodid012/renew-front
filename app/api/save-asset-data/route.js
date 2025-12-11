export const dynamic = 'force-dynamic';

// app/api/save-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request) {
  try {
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
    const configDoc = await request.json();
    const { _id, ...updateFields } = configDoc; // Extract _id and other fields

    if (!_id) {
      return NextResponse.json({ error: 'Document _id is required for update' }, { status: 400 });
    }

    const result = await db.collection('CONFIG_Inputs').updateOne(
      { _id: new ObjectId(_id) }, // Use ObjectId for _id
      { $set: updateFields },
      { upsert: true }
    );

    return NextResponse.json({ success: true, result: result })
  } catch (error) {
    console.error('Failed to save asset data:', error);
    return NextResponse.json({ error: 'Failed to save asset data', details: error.message }, { status: 500 })
  }
}