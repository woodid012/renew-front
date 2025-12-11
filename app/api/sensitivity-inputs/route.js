import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

// Direct MongoDB access for sensitivity config (general config, not portfolio-specific)
export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'renew_assets');
    const collection = db.collection('SENSITIVITY_Config');

    // Query for general/default config (unique_id: "default")
    const config_doc = await collection.findOne({ unique_id: 'default' });

    if (config_doc) {
      // Remove MongoDB-specific fields
      const { _id, updated_at, ...config } = config_doc;
      return NextResponse.json(config);
    } else {
      // Return default structure if no config found
      const defaultConfig = {
        base_scenario_file: null,
        output_collection_prefix: 'sensitivity_results',
        sensitivities: {}
      };
      return NextResponse.json(defaultConfig);
    }
  } catch (error) {
    console.error('Failed to fetch sensitivity inputs:', error);
    // Return default structure on error
    const defaultConfig = {
      base_scenario_file: null,
      output_collection_prefix: 'sensitivity_results',
      sensitivities: {}
    };
    return NextResponse.json(defaultConfig);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'renew_assets');
    const collection = db.collection('SENSITIVITY_Config');

    // Prepare data for saving (save as general config with unique_id: "default")
    const dataToSave = {
      ...body,
      unique_id: 'default',
      updated_at: new Date().toISOString()
    };

    // Upsert the config (update if exists, insert if not)
    const result = await collection.updateOne(
      { unique_id: 'default' },
      { $set: dataToSave },
      { upsert: true }
    );

    return NextResponse.json({
      status: 'success',
      message: 'Sensitivity config saved successfully',
      result: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedId !== null
      }
    });
  } catch (error) {
    console.error('Failed to save sensitivity inputs:', error);
    return NextResponse.json(
      { message: 'Failed to save sensitivity inputs', error: error.message },
      { status: 500 }
    );
  }
}




