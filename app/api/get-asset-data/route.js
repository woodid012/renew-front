
// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const assets = await db.collection('CONFIG_Asset_Inputs').find({}).toArray();

    if (!assets || assets.length === 0) {
      // If no asset is found, return a default structure in an array
      return NextResponse.json([{
        name: "New Asset",
        state: "",
        operatingStartDate: "",
        capacity: 0,
        type: "",
        volumeLossAdjustment: 0,
        annualDegradation: 0,
        assetLife: 0,
        constructionDuration: 0,
        constructionStartDate: "",
        PlatformID: 1,
        PlatformName: "ZEBRE",
      }]);
    }

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Failed to fetch asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch asset data', details: error.message }, { status: 500 })
  }
}
