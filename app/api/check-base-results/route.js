import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('ASSET_cash_flows');

    const count = await collection.countDocuments();

    return NextResponse.json({ exists: count > 0 });
  } catch (error) {
    console.error('Error checking base results:', error);
    return NextResponse.json({ error: 'Failed to check base results' }, { status: 500 });
  }
}