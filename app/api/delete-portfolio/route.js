export const dynamic = 'force-dynamic';

// app/api/delete-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { unique_id, portfolio } = body;
    
    // Accept either unique_id or portfolio (PlatformName)
    let portfolioUniqueId = null;
    
    const client = await clientPromise;
    const db = client.db('renew_assets');
    
    if (unique_id && unique_id.trim()) {
      portfolioUniqueId = unique_id.trim();
    } else if (portfolio && portfolio.trim()) {
      // Look up unique_id by PlatformName
      const portfolioDoc = await db.collection('CONFIG_Inputs').findOne({ 
        PlatformName: portfolio.trim() 
      });
      
      if (!portfolioDoc || !portfolioDoc.unique_id) {
        return NextResponse.json({ 
          error: `Portfolio "${portfolio.trim()}" not found or missing unique_id` 
        }, { status: 404 });
      }
      
      portfolioUniqueId = portfolioDoc.unique_id;
    } else {
      return NextResponse.json({ error: 'Portfolio unique_id or portfolio name is required' }, { status: 400 });
    }
    
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
    if (platformName === 'ZEBRE') {
      return NextResponse.json({ 
        error: 'Cannot delete default portfolio (ZEBRE)' 
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



