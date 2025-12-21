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

export async function GET(request) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uniqueId = searchParams.get('unique_id');

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_modelSettings');

    // Build query: if unique_id provided, query by it; otherwise get global default (no unique_id or unique_id: 'default')
    let query = {};
    if (uniqueId) {
      query = { unique_id: uniqueId };
    } else {
      // For backward compatibility: get settings without unique_id or with unique_id: 'default'
      query = { $or: [{ unique_id: { $exists: false } }, { unique_id: null }, { unique_id: 'default' }] };
    }

    const settings = await collection.findOne(query);

    // If no portfolio-specific settings found and unique_id was provided, fallback to global default
    if (!settings && uniqueId) {
      const globalSettings = await collection.findOne({
        $or: [{ unique_id: { $exists: false } }, { unique_id: null }, { unique_id: 'default' }]
      });
      if (globalSettings) {
        const { _id, ...settingsData } = globalSettings;
        return NextResponse.json({ settings: settingsData });
      }
    }

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    // Remove MongoDB _id field
    const { _id, ...settingsData } = settings;

    // Backward compatibility: Convert old frequency fields to new combined field
    if (!settingsData.debtRepaymentDscrFrequency) {
      // If new field doesn't exist, create it from old fields
      if (settingsData.dscrCalculationFrequency) {
        settingsData.debtRepaymentDscrFrequency = settingsData.dscrCalculationFrequency;
      } else if (settingsData.defaultDebtRepaymentFrequency) {
        settingsData.debtRepaymentDscrFrequency = settingsData.defaultDebtRepaymentFrequency;
      }
    }

    // Backward compatibility: Set default grace period if missing
    if (!settingsData.defaultDebtGracePeriod) {
      settingsData.defaultDebtGracePeriod = 'prorate';
    }

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
    const uniqueId = body.unique_id;
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_modelSettings');

    // Determine unique_id: use provided one, or 'default' for global settings
    const finalUniqueId = uniqueId || 'default';
    
    // Build update query based on unique_id
    const updateQuery = { unique_id: finalUniqueId };
    
    // Prepare update data (exclude unique_id from $set since it's in the query)
    const { unique_id, ...updateData } = body;
    
    // Upsert: replace existing document or create new one, keyed by unique_id
    const result = await collection.updateOne(
      updateQuery,
      {
        $set: {
          ...updateData,
          unique_id: finalUniqueId,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Model settings saved successfully',
      updated: result.modifiedCount > 0,
      created: result.upsertedCount > 0,
      unique_id: finalUniqueId
    });
  } catch (error) {
    console.error('Error saving model settings:', error);
    return NextResponse.json(
      { error: 'Failed to save model settings', message: error.message },
      { status: 500 }
    );
  }
}



