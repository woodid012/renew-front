export const dynamic = 'force-dynamic';

// app/api/delete-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function DELETE(request) {
  try {
    const { unique_id } = await request.json();
    
    if (!unique_id || !unique_id.trim()) {
      return NextResponse.json({ error: 'Portfolio unique_id is required' }, { status: 400 });
    }
    
    const portfolioUniqueId = unique_id.trim();
    
    const client = await clientPromise
    const db = client.db('renew_assets')
    
    // Check if portfolio exists by unique_id
    const existing = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: portfolioUniqueId 
    });
    
    if (!existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Portfolio does not exist',
        unique_id: portfolioUniqueId
      });
    }
    
    // Prevent deletion of default portfolios by checking PlatformName
    const platformName = existing.PlatformName;
    if (platformName === 'ZEBRE' || platformName === 'xxx') {
      return NextResponse.json({ 
        error: 'Cannot delete default portfolios (ZEBRE, xxx)' 
      }, { status: 400 });
    }
    
    // Delete the portfolio document from MongoDB by unique_id
    const deleteResult = await db.collection('CONFIG_Inputs').deleteOne({ 
      unique_id: portfolioUniqueId 
    });
    
    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete portfolio' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Portfolio deleted successfully',
      unique_id: portfolioUniqueId,
      platformName: platformName,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Failed to delete portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to delete portfolio', 
      details: error.message 
    }, { status: 500 });
  }
}



