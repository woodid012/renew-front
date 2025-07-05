
// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const asset = await db.collection('assets').findOne()

    if (!asset) {
      // If no asset is found, return a default structure
      return NextResponse.json({
        name: "New Asset",
        state: "",
        assetStartDate: "",
        capacity: 0,
        type: "",
        volumeLossAdjustment: 0,
        annualDegradation: 0,
        assetLife: 0,
        constructionDuration: 0,
        constructionStartDate: "",
      });
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Failed to fetch asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch asset data', details: error.message }, { status: 500 })
  }
}
