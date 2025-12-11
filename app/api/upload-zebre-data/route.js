export const dynamic = 'force-dynamic';

// app/api/upload-zebre-data/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'

export async function POST(request) {
  try {
    let client;
    try {
      client = await clientPromise;
    } catch (mongoError) {
      console.error('MongoDB connection error:', mongoError);
      return NextResponse.json({ 
        error: 'MongoDB connection failed', 
        details: mongoError.message,
        hint: 'Please check your MONGODB_URI environment variable in .env.local'
      }, { status: 500 });
    }
    
    const db = client.db('renew_assets')
    
    // Read the ZEBRE data file
    // Try multiple possible locations
    const cwd = process.cwd();
    const possiblePaths = [
      path.join(cwd, '..', 'backend-renew', 'data', 'processed_inputs', 'ZEBRE_Inputs.json'),
      path.join(cwd, 'public', 'zebre_2025-01-13.json'),
      path.join(cwd, 'data', 'processed_inputs', 'ZEBRE_Inputs.json'),
      // Also try absolute paths
      'C:\\Projects\\backend-renew\\data\\processed_inputs\\ZEBRE_Inputs.json',
      path.join('C:', 'Projects', 'backend-renew', 'data', 'processed_inputs', 'ZEBRE_Inputs.json'),
    ];
    
    let zebreData = null;
    let filePath = null;
    
    for (const filePathToTry of possiblePaths) {
      try {
        if (fs.existsSync(filePathToTry)) {
          const fileContent = fs.readFileSync(filePathToTry, 'utf8');
          zebreData = JSON.parse(fileContent);
          filePath = filePathToTry;
          console.log(`Found ZEBRE data at: ${filePathToTry}`);
          break;
        }
      } catch (err) {
        console.log(`Tried ${filePathToTry}, not found or error: ${err.message}`);
      }
    }
    
    if (!zebreData) {
      return NextResponse.json({ 
        error: 'ZEBRE data file not found. Tried paths: ' + possiblePaths.join(', ')
      }, { status: 404 });
    }
    
    // Map the data to the expected structure
    // Handle both formats: ZEBRE_Inputs.json (has asset_inputs) and zebre_2025-01-13.json (has assets object)
    let assetInputs = [];
    
    if (zebreData.asset_inputs && Array.isArray(zebreData.asset_inputs)) {
      // Backend format: ZEBRE_Inputs.json
      assetInputs = zebreData.asset_inputs;
    } else if (zebreData.assets && typeof zebreData.assets === 'object') {
      // Frontend export format: convert assets object to array
      assetInputs = Object.values(zebreData.assets).map(asset => ({
        ...asset,
        // Map state to region if needed
        region: asset.region || asset.state,
        // Map assetStartDate to OperatingStartDate if needed
        OperatingStartDate: asset.OperatingStartDate || asset.assetStartDate
      }));
    }
    
    // Check if ZEBRE portfolio already exists
    const existingDoc = await db.collection('CONFIG_Inputs').findOne({ 
      PlatformName: 'ZEBRE' 
    });
    
    // Generate or preserve unique_id
    let uniqueId;
    if (existingDoc && existingDoc.unique_id) {
      // Preserve existing unique_id if it exists
      uniqueId = existingDoc.unique_id;
    } else {
      // Generate a new unique_id
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        uniqueId = nanoid();
        const existingWithId = await db.collection('CONFIG_Inputs').findOne({ 
          unique_id: uniqueId 
        });
        
        if (!existingWithId) {
          break; // Found a unique ID
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique portfolio ID after multiple attempts');
        }
      } while (true);
    }
    
    const configDoc = {
      PlatformName: 'ZEBRE',
      PlatformID: 1,
      unique_id: uniqueId,
      asset_inputs: assetInputs,
      platformInputs: zebreData.general_config || zebreData.platformInputs || null
    };
    
    if (existingDoc) {
      // Update existing document
      const result = await db.collection('CONFIG_Inputs').updateOne(
        { _id: existingDoc._id },
        { $set: configDoc }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'ZEBRE data updated successfully',
        action: 'updated',
        documentId: existingDoc._id.toString(),
        assetsCount: configDoc.asset_inputs.length,
        filePath: filePath
      });
    } else {
      // Insert new document
      const result = await db.collection('CONFIG_Inputs').insertOne(configDoc);
      
      return NextResponse.json({ 
        success: true, 
        message: 'ZEBRE data uploaded successfully',
        action: 'created',
        documentId: result.insertedId.toString(),
        assetsCount: configDoc.asset_inputs.length,
        filePath: filePath
      });
    }
  } catch (error) {
    console.error('Failed to upload ZEBRE data:', error);
    return NextResponse.json({ 
      error: 'Failed to upload ZEBRE data', 
      details: error.message 
    }, { status: 500 });
  }
}

