export const dynamic = 'force-dynamic';

// app/api/delete-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function DELETE(request) {
  try {
    const { portfolio } = await request.json();
    
    if (!portfolio || !portfolio.trim()) {
      return NextResponse.json({ error: 'Portfolio name is required' }, { status: 400 });
    }
    
    const portfolioName = portfolio.trim();
    
    // Prevent deletion of default portfolios
    if (portfolioName === 'ZEBRE' || portfolioName === 'xxx') {
      return NextResponse.json({ 
        error: 'Cannot delete default portfolios (ZEBRE, xxx)' 
      }, { status: 400 });
    }
    
    const client = await clientPromise
    const db = client.db('renew_assets')
    
    // Check if portfolio exists
    const existing = await db.collection('CONFIG_Inputs').findOne({ 
      PlatformName: portfolioName 
    });
    
    if (!existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Portfolio does not exist',
        portfolio: portfolioName
      });
    }
    
    // Delete the portfolio document from MongoDB
    const deleteResult = await db.collection('CONFIG_Inputs').deleteOne({ 
      PlatformName: portfolioName 
    });
    
    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete portfolio' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Portfolio deleted successfully',
      portfolio: portfolioName,
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


