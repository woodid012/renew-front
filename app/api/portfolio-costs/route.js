export const dynamic = 'force-dynamic';

// app/api/portfolio-costs/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const COLLECTION_NAME = 'PORTFOLIO_Costs';

function getDb(client) {
  // Repo uses a mix of env + hardcoded names; prefer env, fallback to renew_assets
  return client.db(process.env.MONGODB_DB || 'renew_assets');
}

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
      return NextResponse.json(
        {
          error: 'MongoDB connection failed',
          details: mongoError.message,
          hint: 'Please check your MONGODB_URI environment variable in .env.local'
        },
        { status: 500 }
      );
    }

    const db = getDb(client);
    const collection = db.collection(COLLECTION_NAME);

    const doc = await collection.findOne({ unique_id: uniqueId });

    if (!doc) {
      return NextResponse.json({
        unique_id: uniqueId,
        assets: {},
        updated_at: null
      });
    }

    // Convert _id to string for safe transport
    const { _id, ...rest } = doc;
    return NextResponse.json({ _id: _id?.toString?.() ?? _id, ...rest });
  } catch (error) {
    console.error('Portfolio costs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio costs', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const uniqueId = body?.unique_id;
    const assets = body?.assets;

    if (!uniqueId) {
      return NextResponse.json({ error: 'unique_id is required' }, { status: 400 });
    }

    if (!assets || typeof assets !== 'object') {
      return NextResponse.json({ error: 'assets object is required' }, { status: 400 });
    }

    let client;
    try {
      client = await clientPromise;
    } catch (mongoError) {
      return NextResponse.json(
        {
          error: 'MongoDB connection failed',
          details: mongoError.message,
          hint: 'Please check your MONGODB_URI environment variable in .env.local'
        },
        { status: 500 }
      );
    }

    const db = getDb(client);
    const collection = db.collection(COLLECTION_NAME);

    const now = new Date();
    const result = await collection.updateOne(
      { unique_id: uniqueId },
      {
        $set: {
          unique_id: uniqueId,
          assets,
          updated_at: now
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Portfolio costs saved successfully',
      updated: result.modifiedCount > 0,
      created: result.upsertedCount > 0,
      updated_at: now.toISOString()
    });
  } catch (error) {
    console.error('Portfolio costs POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save portfolio costs', details: error.message },
      { status: 500 }
    );
  }
}








