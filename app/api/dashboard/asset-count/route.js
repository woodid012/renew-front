// app/api/dashboard/asset-count/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    // Try to get asset data from inputs summary first
    let assetData = null
    
    try {
      const inputsCollection = db.collection('ASSET_inputs_summary')
      
      // Get asset counts by type and region
      const typesPipeline = [
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]
      
      const regionsPipeline = [
        {
          $group: {
            _id: '$region',
            count: { $sum: 1 }
          }
        }
      ]
      
      const totalPipeline = [
        {
          $group: {
            _id: null,
            totalAssets: { $sum: 1 }
          }
        }
      ]
      
      const [typesResult, regionsResult, totalResult] = await Promise.all([
        inputsCollection.aggregate(typesPipeline).toArray(),
        inputsCollection.aggregate(regionsPipeline).toArray(),
        inputsCollection.aggregate(totalPipeline).toArray()
      ])
      
      if (totalResult.length > 0) {
        // Convert arrays to objects for easier consumption
        const byType = {}
        typesResult.forEach(item => {
          if (item._id) {
            byType[item._id] = item.count
          }
        })
        
        const byRegion = {}
        regionsResult.forEach(item => {
          if (item._id) {
            byRegion[item._id] = item.count
          }
        })
        
        assetData = {
          totalAssets: totalResult[0].totalAssets,
          byType: byType,
          byRegion: byRegion
        }
      }
    } catch (inputsError) {
      console.warn('Could not fetch from inputs collection:', inputsError)
    }
    
    // Fallback: get asset counts from cash flows collection
    if (!assetData) {
      try {
        const cashFlowCollection = db.collection('ASSET_cash_flows')
        
        // Get unique asset IDs
        const uniqueAssets = await cashFlowCollection.distinct('asset_id')
        
        assetData = {
          totalAssets: uniqueAssets.length,
          byType: {
            'unknown': uniqueAssets.length
          },
          byRegion: {
            'unknown': uniqueAssets.length
          }
        }
      } catch (cashFlowError) {
        console.warn('Could not fetch from cash flows collection:', cashFlowError)
        
        // Final fallback
        assetData = {
          totalAssets: 0,
          byType: {},
          byRegion: {}
        }
      }
    }
    
    return NextResponse.json(assetData)
    
  } catch (error) {
    console.error('Asset count API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset count' },
      { status: 500 }
    )
  }
}