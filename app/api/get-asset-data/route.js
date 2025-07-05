
// app/api/get-asset-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('energy_contracts')
    const portfolio = await db.collection('portfolios').findOne({ userId: 'ZEBRE' })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    // For simplicity, returning the first asset
    const firstAsset = Object.values(portfolio.assets)[0]

    return NextResponse.json(firstAsset)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch asset data' }, { status: 500 })
  }
}
