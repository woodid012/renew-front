export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('asset_id');

  if (!assetId) {
    return NextResponse.json({ error: 'Missing asset_id parameter' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('renew_assets');
    const collection = db.collection('ASSET_cash_flows');

    const data = await collection.find({ asset_id: parseInt(assetId) }).sort({ date: 1 }).toArray();

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching asset cashflows:', error);
    return NextResponse.json({ error: 'Failed to fetch asset cashflows' }, { status: 500 });
  }
}