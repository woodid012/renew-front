
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('renew_assets');
    const collection = db.collection('ASSET_cash_flows');

    const data = await collection.find({}).sort({ date: 1 }).toArray();

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return NextResponse.json({ error: 'Failed to fetch time series data' }, { status: 500 });
  }
}
