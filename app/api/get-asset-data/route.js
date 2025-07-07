export const dynamic = 'force-dynamic';

// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const configDoc = await db.collection('CONFIG_Inputs').findOne({});

    if (!configDoc || !configDoc.asset_inputs || configDoc.asset_inputs.length === 0) {
      // If no asset is found, return a default structure in an array
      return NextResponse.json({
        asset_inputs: [{
          id: 1,
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
          contracts: []
        }]
      });
    }

    return NextResponse.json(configDoc);
  } catch (error) {
    console.error('Failed to fetch asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch asset data', details: error.message }, { status: 500 })
  }
}