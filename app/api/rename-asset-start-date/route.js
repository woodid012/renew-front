// app/api/rename-asset-start-date/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const collection = db.collection('CONFIG_Asset_Inputs')

    const result = await collection.updateMany(
      { assetStartDate: { $exists: true } },
      { $rename: { assetStartDate: 'operatingStartDate' } }
    );

    return NextResponse.json({ success: true, message: `${result.modifiedCount} documents updated successfully.` })

  } catch (error) {
    console.error('Field rename failed:', error);
    return NextResponse.json({ error: 'Field rename failed', details: error.message }, { status: 500 })
  }
}
