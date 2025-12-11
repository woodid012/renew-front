// app/api/add-platform-fields/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const collection = db.collection('CONFIG_Asset_Inputs')

    const result = await collection.updateMany(
      {},
      { $set: { PlatformID: 1, PlatformName: "ZEBRE" } }
    );

    return NextResponse.json({ success: true, message: `${result.modifiedCount} documents updated successfully.` })

  } catch (error) {
    console.error('Field update failed:', error);
    return NextResponse.json({ error: 'Field update failed', details: error.message }, { status: 500 })
  }
}
