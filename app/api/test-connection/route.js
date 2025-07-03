// app/api/test-connection/route.js
import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)

    return NextResponse.json({ 
      status: 'Connected', 
      db: process.env.MONGODB_DB,
      collections: collectionNames 
    })
    
  } catch (error) {
    console.error('Test connection API error:', error)
    return NextResponse.json(
      { 
        status: 'Error', 
        error: error.message,
        db: process.env.MONGODB_DB
      },
      { status: 500 }
    )
  }
}