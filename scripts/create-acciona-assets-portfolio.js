// scripts/create-acciona-assets-portfolio.js
// Script to create "Acciona Assets" portfolio by copying MW, state, and names from "Acciona Merchant"
// and setting up the rest of the inputs from default asset values

const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'renew_assets';

// Load asset defaults from backend config
function loadAssetDefaults() {
  const defaultPath = path.join(__dirname, '..', '..', 'backend-renew', 'config', 'asset_defaults.json');
  if (fs.existsSync(defaultPath)) {
    const content = fs.readFileSync(defaultPath, 'utf8');
    return JSON.parse(content);
  }
  // Return minimal defaults if file not found
  return {
    assetDefaults: {
      solar: {
        assetLife: 25,
        volumeLossAdjustment: 95,
        annualDegradation: 0.5,
        constructionDuration: 18,
        capacityFactors: {
          NSW: { q1: 28, q2: 25, q3: 27, q4: 30 },
          VIC: { q1: 25, q2: 22, q3: 23, q4: 27 },
          QLD: { q1: 29, q2: 26, q3: 28, q4: 31 },
          SA: { q1: 27, q2: 24, q3: 26, q4: 29 },
          WA: { q1: 26, q2: 23, q3: 25, q4: 28 },
          TAS: { q1: 23, q2: 20, q3: 22, q4: 25 }
        },
        costAssumptions: {
          capexPerMW: 1.344,
          opexPerMWPerYear: 0.055,
          operatingCostEscalation: 2.5,
          terminalValuePerMW: 0,
          maxGearing: 0.7,
          targetDSCRContract: 1.4,
          targetDSCRMerchant: 1.8,
          interestRate: 0.06,
          tenorYears: 20,
          debtStructure: "sculpting"
        }
      },
      wind: {
        assetLife: 25,
        volumeLossAdjustment: 95,
        annualDegradation: 0.5,
        constructionDuration: 24,
        capacityFactors: {
          NSW: { q1: 35, q2: 32, q3: 34, q4: 38 },
          VIC: { q1: 38, q2: 35, q3: 37, q4: 41 },
          QLD: { q1: 32, q2: 29, q3: 31, q4: 35 },
          SA: { q1: 40, q2: 37, q3: 39, q4: 43 },
          WA: { q1: 37, q2: 34, q3: 36, q4: 40 },
          TAS: { q1: 42, q2: 39, q3: 41, q4: 45 }
        },
        costAssumptions: {
          capexPerMW: 3.221,
          opexPerMWPerYear: 0.045,
          operatingCostEscalation: 2.5,
          terminalValuePerMW: 0,
          maxGearing: 0.65,
          targetDSCRContract: 1.4,
          targetDSCRMerchant: 1.8,
          interestRate: 0.06,
          tenorYears: 20,
          debtStructure: "sculpting"
        }
      },
      storage: {
        assetLife: 15,
        volumeLossAdjustment: 95,
        annualDegradation: 1.0,
        constructionDuration: 12,
        durationHours: 2,
        roundTripEfficiency: 85,
        costAssumptions: {
          capexPerMW: 2.0,
          opexPerMWPerYear: 0.03,
          operatingCostEscalation: 2.5,
          terminalValuePerMW: 0.5,
          maxGearing: 0.6,
          targetDSCRContract: 1.5,
          targetDSCRMerchant: 2.0,
          interestRate: 0.065,
          tenorYears: 15,
          debtStructure: "sculpting"
        }
      }
    }
  };
}

// Create a new asset with defaults based on type and region
function createAssetWithDefaults(assetType, region, name, capacity, assetDefaults) {
  const defaults = assetDefaults.assetDefaults[assetType] || assetDefaults.assetDefaults.solar;
  const regionDefaults = defaults.capacityFactors?.[region] || defaults.capacityFactors?.NSW || {};
  
  const baseAsset = {
    name: name,
    region: region,
    type: assetType,
    capacity: capacity,
    assetLife: defaults.assetLife || 25,
    volumeLossAdjustment: defaults.volumeLossAdjustment || 95,
    annualDegradation: defaults.annualDegradation || 0.5,
    constructionDuration: defaults.constructionDuration || 18,
    contracts: [],
    costAssumptions: defaults.costAssumptions || {}
  };

  // Add capacity factors if available
  if (regionDefaults.q1 !== undefined) {
    baseAsset.qtrCapacityFactor_q1 = String(regionDefaults.q1);
    baseAsset.qtrCapacityFactor_q2 = String(regionDefaults.q2);
    baseAsset.qtrCapacityFactor_q3 = String(regionDefaults.q3);
    baseAsset.qtrCapacityFactor_q4 = String(regionDefaults.q4);
    
    // Calculate average capacity factor
    const avg = (regionDefaults.q1 + regionDefaults.q2 + regionDefaults.q3 + regionDefaults.q4) / 4;
    baseAsset.capacityFactor = String(avg.toFixed(1));
  }

  // Add storage-specific fields
  if (assetType === 'storage') {
    baseAsset.durationHours = defaults.durationHours || 2;
    baseAsset.roundTripEfficiency = defaults.roundTripEfficiency || 85;
    baseAsset.volume = String(parseFloat(capacity) * (defaults.durationHours || 2));
  }

  return baseAsset;
}

async function createAccionaAssetsPortfolio() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    console.error('Please set MONGODB_URI in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_Inputs');
    
    // Find Acciona Merchant portfolio
    console.log('\nLooking for "Acciona Merchant" portfolio...');
    const accionaMerchant = await collection.findOne({ 
      PlatformName: 'Acciona Merchant' 
    });
    
    if (!accionaMerchant) {
      console.error('✗ "Acciona Merchant" portfolio not found');
      console.error('Available portfolios:');
      const allPortfolios = await collection.find({}, { projection: { PlatformName: 1 } }).toArray();
      allPortfolios.forEach(p => console.error(`  - ${p.PlatformName}`));
      process.exit(1);
    }
    
    console.log(`✓ Found "Acciona Merchant" portfolio`);
    console.log(`  unique_id: ${accionaMerchant.unique_id || '(none)'}`);
    console.log(`  Assets: ${accionaMerchant.asset_inputs?.length || 0}`);
    
    // Check if Acciona Assets already exists
    const existingAccionaAssets = await collection.findOne({ 
      PlatformName: 'Acciona Assets' 
    });
    
    if (existingAccionaAssets) {
      console.log('\n⚠ "Acciona Assets" portfolio already exists');
      console.log(`  unique_id: ${existingAccionaAssets.unique_id}`);
      console.log(`  Assets: ${existingAccionaAssets.asset_inputs?.length || 0}`);
      console.log('\nDo you want to overwrite it? (This script will not overwrite - please delete it first if needed)');
      process.exit(1);
    }
    
    // Load asset defaults
    const assetDefaults = loadAssetDefaults();
    console.log('\n✓ Loaded asset defaults');
    
    // Extract MW (capacity), state (region), and names from Acciona Merchant
    const sourceAssets = accionaMerchant.asset_inputs || [];
    console.log(`\nProcessing ${sourceAssets.length} assets from Acciona Merchant...`);
    
    const newAssets = [];
    let assetId = 1;
    
    for (const sourceAsset of sourceAssets) {
      const name = sourceAsset.name || `Asset ${assetId}`;
      const capacity = sourceAsset.capacity || 0;
      const region = sourceAsset.region || sourceAsset.state || 'NSW';
      const type = sourceAsset.type || 'solar';
      
      console.log(`  Asset ${assetId}: ${name} (${capacity} MW, ${region}, ${type})`);
      
      // Create new asset with defaults, but keep name, capacity, region, and type
      const newAsset = createAssetWithDefaults(type, region, name, capacity, assetDefaults);
      newAsset.id = String(assetId);
      
      newAssets.push(newAsset);
      assetId++;
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
      PlatformName: 'Acciona Assets',
      PlatformID: accionaMerchant.PlatformID || null,
      PortfolioTitle: 'Acciona Assets',
      unique_id: uniqueId,
      asset_inputs: newAssets,
      platformInputs: accionaMerchant.platformInputs || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log(`\nCreating new portfolio "Acciona Assets"...`);
    console.log(`  unique_id: ${uniqueId}`);
    console.log(`  Assets: ${newAssets.length}`);
    
    // Insert the new portfolio
    const result = await collection.insertOne(newPortfolio);
    
    console.log(`\n✓ Successfully created "Acciona Assets" portfolio`);
    console.log(`  Document ID: ${result.insertedId}`);
    console.log(`  unique_id: ${uniqueId}`);
    console.log(`  Assets: ${newAssets.length}`);
    
    // Verify the creation
    const verifyDoc = await collection.findOne({ unique_id: uniqueId });
    if (verifyDoc && verifyDoc.asset_inputs) {
      console.log(`\n✓ Verification: Found ${verifyDoc.asset_inputs.length} assets in database`);
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
createAccionaAssetsPortfolio()
  .then(() => {
    console.log('\n✓ Script complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
