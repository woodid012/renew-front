// scripts/upload-zebre-data.js
// Script to upload ZEBRE data to MongoDB

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection string from environment or default
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || 'mongodb://localhost:27017';

async function uploadZebreData() {
  let client;
  
  try {
    // Read the ZEBRE data file
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'backend-renew', 'data', 'processed_inputs', 'ZEBRE_Inputs.json'),
      path.join(__dirname, '..', 'public', 'zebre_2025-01-13.json'),
      path.join(__dirname, '..', 'data', 'processed_inputs', 'ZEBRE_Inputs.json'),
    ];
    
    let zebreData = null;
    let filePath = null;
    
    for (const filePathToTry of possiblePaths) {
      try {
        if (fs.existsSync(filePathToTry)) {
          const fileContent = fs.readFileSync(filePathToTry, 'utf8');
          zebreData = JSON.parse(fileContent);
          filePath = filePathToTry;
          console.log(`✓ Found ZEBRE data at: ${filePathToTry}`);
          break;
        }
      } catch (err) {
        console.log(`  Tried ${filePathToTry}, not found`);
      }
    }
    
    if (!zebreData) {
      console.error('✗ ZEBRE data file not found. Tried paths:');
      possiblePaths.forEach(p => console.error(`  - ${p}`));
      process.exit(1);
    }
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('renew_assets');
    const collection = db.collection('CONFIG_Inputs');
    
    // Map the data to the expected structure
    let assetInputs = [];
    
    if (zebreData.asset_inputs && Array.isArray(zebreData.asset_inputs)) {
      // Backend format: ZEBRE_Inputs.json
      assetInputs = zebreData.asset_inputs;
    } else if (zebreData.assets && typeof zebreData.assets === 'object') {
      // Frontend export format: convert assets object to array
      assetInputs = Object.values(zebreData.assets).map(asset => ({
        ...asset,
        region: asset.region || asset.state,
        OperatingStartDate: asset.OperatingStartDate || asset.assetStartDate
      }));
    }
    
    const configDoc = {
      PlatformName: 'ZEBRE',
      PlatformID: 1,
      asset_inputs: assetInputs,
      platformInputs: zebreData.general_config || zebreData.platformInputs || null
    };
    
    console.log(`\nPreparing to upload:`);
    console.log(`  Platform: ZEBRE`);
    console.log(`  Assets: ${assetInputs.length}`);
    console.log(`  File: ${filePath}\n`);
    
    // Check if ZEBRE portfolio already exists
    const existingDoc = await collection.findOne({ PlatformName: 'ZEBRE' });
    
    if (existingDoc) {
      // Update existing document
      const result = await collection.updateOne(
        { _id: existingDoc._id },
        { $set: configDoc }
      );
      
      console.log('✓ ZEBRE data updated successfully');
      console.log(`  Document ID: ${existingDoc._id}`);
      console.log(`  Assets: ${assetInputs.length}`);
    } else {
      // Insert new document
      const result = await collection.insertOne(configDoc);
      
      console.log('✓ ZEBRE data uploaded successfully');
      console.log(`  Document ID: ${result.insertedId}`);
      console.log(`  Assets: ${assetInputs.length}`);
    }
    
    // Verify the upload
    const verifyDoc = await collection.findOne({ PlatformName: 'ZEBRE' });
    if (verifyDoc && verifyDoc.asset_inputs) {
      console.log(`\n✓ Verification: Found ${verifyDoc.asset_inputs.length} assets in database`);
    } else {
      console.log('\n⚠ Warning: Could not verify upload');
    }
    
  } catch (error) {
    console.error('✗ Error uploading ZEBRE data:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✓ MongoDB connection closed');
    }
  }
}

// Run the upload
uploadZebreData()
  .then(() => {
    console.log('\n✓ Upload complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Upload failed:', error);
    process.exit(1);
  });






