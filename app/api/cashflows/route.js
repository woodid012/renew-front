import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request) {
  try {
    await client.connect();
    const database = client.db('renew_db');
    const collection = database.collection('ASSET_cashflows');
    const data = await collection.find({}).toArray();

    return NextResponse.json({
      message: 'Successfully fetched ASSET_cashflows',
      data: data
    });
  } catch (error) {
    console.error('MongoDB fetch error:', error);
    return NextResponse.json({
      message: 'Failed to fetch ASSET_cashflows',
      error: error.message
    }, { status: 500 });
  } finally {
    await client.close();
  }
}