// scripts/create-aula-energy-portfolio.js
// Script to create "Aula Energy" portfolio from JSON file

const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'renew_assets';

// Path to the JSON file
const JSON_FILE_PATH = 'c:\\Projects\\renew-asset-platform\\public\\aula_2025-01-13.json';

async function createAulaEnergyPortfolio() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    console.error('Please set MONGODB_URI in .env.local');
    process.exit(1);
  }

  // Read and parse the JSON file
  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`✗ JSON file not found: ${JSON_FILE_PATH}`);
    process.exit(1);
  }

  console.log(`\nReading JSON file: ${JSON_FILE_PATH}`);
  const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf8');
  const jsonData = JSON.parse(jsonContent);
  
  console.log(`✓ Loaded JSON data`);
  console.log(`  Portfolio name: ${jsonData.portfolioName || 'N/A'}`);
  console.log(`  Assets: ${Object.keys(jsonData.assets || {}).length}`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_Inputs');
    
    // Check if Aula Energy already exists
    const existingAulaEnergy = await collection.findOne({ 
      PlatformName: 'Aula Energy' 
    });
    
    if (existingAulaEnergy) {
      console.log('\n⚠ "Aula Energy" portfolio already exists');
      console.log(`  unique_id: ${existingAulaEnergy.unique_id}`);
      console.log(`  Assets: ${existingAulaEnergy.asset_inputs?.length || 0}`);
      console.log('\nDo you want to overwrite it? (This script will not overwrite - please delete it first if needed)');
      process.exit(1);
    }
    
    // Convert assets from JSON format to portfolio format
    const assets = jsonData.assets || {};
    const assetInputs = [];
    
    // Sort by asset ID to maintain order
    const sortedAssetIds = Object.keys(assets).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const assetKey of sortedAssetIds) {
      const asset = assets[assetKey];
      
      // Convert asset ID to integer
      const assetId = parseInt(asset.id || assetKey);
      
      if (isNaN(assetId)) {
        console.warn(`⚠ Skipping asset with invalid ID: ${asset.id || assetKey}`);
        continue;
      }
      
      // Create asset object with integer ID (stored as string in DB per existing pattern)
      const assetInput = {
        id: String(assetId), // Store as string in database (as per existing pattern)
        name: asset.name || `Asset ${assetId}`,
        region: asset.region || 'NSW',
        type: asset.type || 'solar',
        capacity: asset.capacity || 0,
        assetLife: asset.assetLife || 25,
        volumeLossAdjustment: asset.volumeLossAdjustment || 95,
        annualDegradation: asset.annualDegradation || 0.5,
        OperatingStartDate: asset.OperatingStartDate || null,
        contracts: (asset.contracts || []).map(contract => ({
          id: String(contract.id || '1'),
          counterparty: contract.counterparty || '',
          type: contract.type || 'bundled',
          buyersPercentage: contract.buyersPercentage || 100,
          strikePrice: String(contract.strikePrice || '0'),
          greenPrice: String(contract.greenPrice || '0'),
          EnergyPrice: String(contract.EnergyPrice || '0'),
          indexation: contract.indexation || 0,
          hasFloor: contract.hasFloor || false,
          floorValue: String(contract.floorValue || '0'),
          startDate: contract.startDate || null,
          endDate: contract.endDate || null,
          indexationReferenceYear: contract.indexationReferenceYear || null
        })),
        qtrCapacityFactor_q1: String(asset.qtrCapacityFactor_q1 || '0'),
        qtrCapacityFactor_q2: String(asset.qtrCapacityFactor_q2 || '0'),
        qtrCapacityFactor_q3: String(asset.qtrCapacityFactor_q3 || '0'),
        qtrCapacityFactor_q4: String(asset.qtrCapacityFactor_q4 || '0'),
        capacityFactor: String(asset.capacityFactor || '0')
      };
      
      assetInputs.push(assetInput);
      console.log(`  Asset ${assetId}: ${assetInput.name} (${assetInput.capacity} MW, ${assetInput.region}, ${assetInput.type})`);
    }
    
    // Generate unique_id
    let uniqueId = nanoid();
    // Ensure it's unique
    let attempts = 0;
    while (await collection.findOne({ unique_id: uniqueId })) {
      uniqueId = nanoid();
      attempts++;
      if (attempts > 10) {
        console.error('✗ Failed to generate unique unique_id after 10 attempts');
        process.exit(1);
      }
    }
    
    // Create new portfolio document
    const newPortfolio = {
      PlatformName: 'Aula Energy',
      PlatformID: null,
      PortfolioTitle: 'Aula Energy',
      unique_id: uniqueId,
      asset_inputs: assetInputs,
      platformInputs: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log(`\nCreating new portfolio "Aula Energy"...`);
    console.log(`  unique_id: ${uniqueId}`);
    console.log(`  Assets: ${assetInputs.length}`);
    
    // Insert the new portfolio
    const result = await collection.insertOne(newPortfolio);
    
    console.log(`\n✓ Successfully created "Aula Energy" portfolio`);
    console.log(`  Document ID: ${result.insertedId}`);
    console.log(`  unique_id: ${uniqueId}`);
    console.log(`  Assets: ${assetInputs.length}`);
    
    // Verify the creation
    const verifyDoc = await collection.findOne({ unique_id: uniqueId });
    if (verifyDoc && verifyDoc.asset_inputs) {
      console.log(`\n✓ Verification: Found ${verifyDoc.asset_inputs.length} assets in database`);
      
      // Verify asset IDs are integers (stored as strings)
      const assetIds = verifyDoc.asset_inputs.map(a => parseInt(a.id)).filter(id => !isNaN(id));
      console.log(`✓ Verification: Asset IDs are integers: [${assetIds.join(', ')}]`);
      
      console.log(`\nPortfolio created successfully!`);
      console.log(`You can now use unique_id "${uniqueId}" to access this portfolio.`);
    } else {
      console.log('\n⚠ Warning: Could not verify portfolio creation');
    }
    
  } catch (error) {
    console.error('✗ Error creating portfolio:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ MongoDB connection closed');
  }
}

// Run the script
createAulaEnergyPortfolio()
  .then(() => {
    console.log('\n✓ Script complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });



