// app/api/debug/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    console.log('Starting database diagnostic...')
    console.log('MongoDB DB:', process.env.MONGODB_DB)
    
    const client = await clientPromise
    console.log('Client obtained:', !!client)
    
    const db = client.db(process.env.MONGODB_DB)
    console.log('Database object created:', !!db)
    
    // Use the same approach as your test-connection page
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    console.log('Collections found:', collectionNames)
    
    const diagnostics = {
      status: 'Connected',
      database: process.env.MONGODB_DB,
      totalCollections: collectionNames.length,
      collections: collectionNames,
      collectionDetails: {}
    }
    
    // Check the specific collections we care about
    const collectionsToCheck = [
      'ASSET_inputs_summary',
      'ASSET_cash_flows', 
      'ASSET_revenue_data'
    ]
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`Checking collection: ${collectionName}`)
        
        if (collectionNames.includes(collectionName)) {
          const collection = db.collection(collectionName)
          const count = await collection.countDocuments()
          console.log(`${collectionName} document count: ${count}`)
          
          let sampleDoc = null
          let sampleFields = []
          let assetIds = []
          
          if (count > 0) {
            // Get a sample document
            sampleDoc = await collection.findOne()
            sampleFields = Object.keys(sampleDoc || {})
            
            // Try to get asset_ids
            try {
              assetIds = await collection.distinct('asset_id')
            } catch (e) {
              console.log(`No asset_id field in ${collectionName}`)
            }
          }
          
          diagnostics.collectionDetails[collectionName] = {
            exists: true,
            documentCount: count,
            sampleFields: sampleFields,
            uniqueAssetIds: assetIds.slice(0, 5),
            sampleDocument: sampleDoc ? {
              _id: sampleDoc._id,
              asset_id: sampleDoc.asset_id,
              asset_name: sampleDoc.asset_name || sampleDoc.name,
              scenario_id: sampleDoc.scenario_id,
              date: sampleDoc.date,
              type: sampleDoc.type,
              region: sampleDoc.region,
              capacity: sampleDoc.capacity,
              capex: sampleDoc.capex || sampleDoc.cost_capex,
              // Show first 10 fields
              ...Object.fromEntries(
                Object.entries(sampleDoc)
                  .filter(([key]) => !['_id'].includes(key))
                  .slice(0, 10)
              )
            } : null
          }
        } else {
          diagnostics.collectionDetails[collectionName] = {
            exists: false,
            documentCount: 0
          }
        }
        
      } catch (collectionError) {
        console.error(`Error checking collection ${collectionName}:`, collectionError)
        diagnostics.collectionDetails[collectionName] = {
          error: collectionError.message
        }
      }
    }
    
    // Find collections that actually have data
    const collectionsWithData = []
    for (const collectionName of collectionNames) {
      try {
        const collection = db.collection(collectionName)
        const count = await collection.countDocuments()
        if (count > 0) {
          collectionsWithData.push({
            name: collectionName,
            count: count
          })
        }
      } catch (e) {
        // Skip
      }
    }
    
    diagnostics.collectionsWithData = collectionsWithData
    
    console.log('Diagnostic complete')
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('Database diagnostic error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to diagnose database', 
        details: error.message,
        stack: error.stack,
        database: process.env.MONGODB_DB || 'Not set'
      },
      { status: 500 }
    )
  }
}