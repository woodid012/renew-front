export const dynamic = 'force-dynamic';

// app/api/update-platform-name/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request) {
  try {
    const { unique_id, platformName } = await request.json();
    
    if (!unique_id || !unique_id.trim()) {
      return NextResponse.json({ error: 'unique_id is required' }, { status: 400 });
    }
    
    if (!platformName || !platformName.trim()) {
      return NextResponse.json({ error: 'platformName is required' }, { status: 400 });
    }
    
    const portfolioUniqueId = unique_id.trim();
    const newPlatformName = platformName.trim();
    
    const client = await clientPromise
    const db = client.db('renew_assets')
    
    // Check if portfolio exists by unique_id
    const existing = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: portfolioUniqueId 
    });
    
    if (!existing) {
      return NextResponse.json({ 
        error: 'Portfolio not found for the provided unique_id',
        unique_id: portfolioUniqueId
      }, { status: 404 });
    }
    
    const previousPlatformName = existing.PlatformName;
    
    // Update PlatformName for all documents with this unique_id
    const updateResult = await db.collection('CONFIG_Inputs').updateMany(
      { unique_id: portfolioUniqueId },
      { $set: { PlatformName: newPlatformName } }
    );
    
    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ 
        error: 'Portfolio not found' 
      }, { status: 404 });
    }
    
    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'PlatformName unchanged (already set to this value)',
        unique_id: portfolioUniqueId,
        platformName: newPlatformName,
        documentsMatched: updateResult.matchedCount
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'PlatformName updated successfully',
      unique_id: portfolioUniqueId,
      platformName: newPlatformName,
      previousPlatformName: previousPlatformName,
      documentsMatched: updateResult.matchedCount,
      documentsModified: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Failed to update PlatformName:', error);
    return NextResponse.json({ 
      error: 'Failed to update PlatformName', 
      details: error.message 
    }, { status: 500 });
  }
}




