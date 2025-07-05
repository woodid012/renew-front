
// app/api/save-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request) {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const assetData = await request.json();
    delete assetData._id; // Ensure _id is not part of the update

    if (!assetData.name) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }

    const result = await db.collection('CONFIG_Asset_Inputs').updateOne(
      { name: assetData.name },
      { $set: assetData },
      { upsert: true }
    );

    return NextResponse.json({ success: true, result: result })
  } catch (error) {
    console.error('Failed to save asset data:', error);
    return NextResponse.json({ error: 'Failed to save asset data', details: error.message }, { status: 500 })
  }
}
