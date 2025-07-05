// app/api/migrate-assets/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise

    // Source Database and Collection
    const sourceDb = client.db('energy_contracts')
    const sourceCollection = sourceDb.collection('portfolios')

    // Destination Database and Collection
    const destDb = client.db('renew_assets')
    const destCollection = destDb.collection('assets')

    // 1. Find the portfolio
    const portfolio = await sourceCollection.findOne({ userId: 'ZEBRE' })

    if (!portfolio || !portfolio.assets) {
      return NextResponse.json({ message: 'No assets found in the source portfolio to migrate.' }, { status: 404 })
    }

    // 2. Extract assets from the portfolio
    const assetsToMigrate = Object.values(portfolio.assets)

    if (assetsToMigrate.length === 0) {
      return NextResponse.json({ message: 'No assets to migrate.' })
    }

    // 3. Insert assets into the new database
    // Using a loop with upsert to avoid duplicates if run multiple times
    let migratedCount = 0;
    for (const asset of assetsToMigrate) {
        if (!asset.name) continue; // Skip assets without a name

        const result = await destCollection.updateOne(
            { name: asset.name },
            { $set: asset },
            { upsert: true }
        );

        if (result.upsertedId || result.modifiedCount > 0) {
            migratedCount++;
        }
    }

    return NextResponse.json({ success: true, message: `${migratedCount} assets migrated successfully.` })

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
