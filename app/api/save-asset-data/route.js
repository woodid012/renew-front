
// app/api/save-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request) {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const assetData = await request.json()

    // Save to the INPUT collection
    const result = await db.collection('INPUT').insertOne(assetData)

    return NextResponse.json({ success: true, insertedId: result.insertedId })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save asset data' }, { status: 500 })
  }
}
