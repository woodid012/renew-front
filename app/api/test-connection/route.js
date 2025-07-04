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

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const data = {};
    for (const collectionName of collectionNames) {
      try {
        const firstDocument = await db.collection(collectionName).findOne({});
        data[collectionName] = firstDocument;
      } catch (docError) {
        console.warn(`Could not fetch first document from collection ${collectionName}:`, docError);
        data[collectionName] = { error: `Could not fetch document: ${docError.message}` };
      }
    }

    return NextResponse.json({
      status: 'Connected',
      db: dbName,
      collections: collectionNames,
      sampleData: data,
    });
  } catch (error) {
    console.error('Error connecting to MongoDB or fetching data:', error);
    return NextResponse.json(
      { status: 'Error', message: 'Failed to connect to MongoDB or fetch data', error: error.message },
      { status: 500 }
    );
  }
}
