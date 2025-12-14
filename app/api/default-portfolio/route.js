export const dynamic = 'force-dynamic';

// app/api/default-portfolio/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

// GET - Retrieve the default portfolio unique_id
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('renew_assets');
    
    // Get default portfolio from settings collection
    const settings = await db.collection('Settings').findOne({ 
      type: 'default_portfolio' 
    });
    
    const defaultUniqueId = settings?.value || null;
    
    return NextResponse.json({ 
      success: true,
      defaultPortfolio: defaultUniqueId
    });
  } catch (error) {
    console.error('Failed to get default portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to get default portfolio', 
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Set the default portfolio unique_id
export async function POST(request) {
  try {
    const body = await request.json();
    const { unique_id } = body;
    
    if (!unique_id || !unique_id.trim()) {
      return NextResponse.json({ 
        error: 'Portfolio unique_id is required' 
      }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('renew_assets');
    
    // Verify the portfolio exists
    const portfolio = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: unique_id.trim() 
    });
    
    if (!portfolio) {
      return NextResponse.json({ 
        error: `Portfolio with unique_id "${unique_id}" not found` 
      }, { status: 404 });
    }
    
    // Update or insert the default portfolio setting
    await db.collection('Settings').updateOne(
      { type: 'default_portfolio' },
      { 
        $set: { 
          value: unique_id.trim(),
          updated_at: new Date()
        } 
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Default portfolio set successfully',
      defaultPortfolio: unique_id.trim()
    });
  } catch (error) {
    console.error('Failed to set default portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to set default portfolio', 
      details: error.message 
    }, { status: 500 });
  }
}
