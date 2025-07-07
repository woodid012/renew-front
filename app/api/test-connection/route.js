import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

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
      db: db.databaseName,
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
