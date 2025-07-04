import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(); // Connects to the database specified in MONGODB_URI
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset_id');

    if (assetId) {
      // If asset_id is provided, return the first document for that asset_id
      const data = await collection.find({ asset_id: parseInt(assetId) }).sort({ date: 1 }).toArray();
      return NextResponse.json({ data });
    } else {
      // If no asset_id, return all unique asset_ids
      const uniqueAssetIds = await collection.distinct('asset_id');
      return NextResponse.json({ uniqueAssetIds });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}