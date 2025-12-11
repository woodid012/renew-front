// app/api/model-settings/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'renew_project';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
}

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function GET() {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string not configured' },
        { status: 500 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_modelSettings');

    const settings = await collection.findOne({});

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    // Remove MongoDB _id field
    const { _id, ...settingsData } = settings;

    return NextResponse.json({ settings: settingsData });
  } catch (error) {
    console.error('Error fetching model settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model settings', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_modelSettings');

    // Upsert: replace existing document or create new one
    const result = await collection.updateOne(
      {},
      {
        $set: {
          ...body,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Model settings saved successfully',
      updated: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    });
  } catch (error) {
    console.error('Error saving model settings:', error);
    return NextResponse.json(
      { error: 'Failed to save model settings', message: error.message },
      { status: 500 }
    );
  }
}



