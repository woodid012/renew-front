import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your MONGODB_URI to .env.local');
}

if (!dbName) {
  throw new Error('Please add your MONGODB_DB to .env.local');
}

// In production, it's best practice to use a global variable
// to avoid reconnecting on every API call.
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection('PRICE_Curves');
    const data = await collection.find({}).toArray();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching price curves directly from MongoDB:', error);
    return NextResponse.json({ message: 'Error fetching price curves', error: error.message }, { status: 500 });
  }
}