// Migration script to add unique_id to CONFIG_Inputs documents
// Generates nanoid-based unique_id for portfolios that have text-based unique_id values
// Run this once: node scripts/add-unique-id-to-config-inputs.js

const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'renew_assets';

async function addUniqueIdToConfigInputs() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('CONFIG_Inputs');
    
    // Find all portfolio documents
    const portfolios = await collection.find({}).toArray();
    console.log(`Found ${portfolios.length} portfolio document(s) to process`);
    
    // Helper function to check if a string is a valid nanoid format
    // nanoid generates 21-character URL-safe alphanumeric strings
    function isValidNanoid(str) {
      if (!str || typeof str !== 'string') return false;
      // nanoid uses URL-safe characters: A-Za-z0-9_-
      // Default length is 21 characters
      return str.length === 21 && /^[A-Za-z0-9_-]+$/.test(str);
    }
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    const existingUniqueIds = new Set();
    
    // First pass: collect all existing unique_ids to avoid collisions
    for (const portfolio of portfolios) {
      if (portfolio.unique_id && isValidNanoid(portfolio.unique_id)) {
        existingUniqueIds.add(portfolio.unique_id);
      }
    }
    
    for (const portfolio of portfolios) {
      if (!portfolio.PlatformName) {
        console.log(`  Portfolio with _id "${portfolio._id}": No PlatformName found, skipping`);
        totalSkipped++;
        continue;
      }
      
      // Check if unique_id already exists and is a valid nanoid
      if (portfolio.unique_id && isValidNanoid(portfolio.unique_id)) {
        console.log(`  Portfolio "${portfolio.PlatformName}": Already has valid nanoid unique_id = "${portfolio.unique_id}"`);
        totalSkipped++;
        continue;
      }
      
      // Generate a new unique_id using nanoid
      // Ensure no duplicate unique_ids are generated
      let uniqueId = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        uniqueId = nanoid();
        if (!existingUniqueIds.has(uniqueId)) {
          existingUniqueIds.add(uniqueId);
          break; // Found a unique ID
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`  Portfolio "${portfolio.PlatformName}": Failed to generate unique ID after ${maxAttempts} attempts`);
          uniqueId = null;
          break;
        }
      } while (true);
      
      if (uniqueId) {
        // Update the portfolio document
        await collection.updateOne(
          { _id: portfolio._id },
          { $set: { unique_id: uniqueId } }
        );
        
        const oldId = portfolio.unique_id || '(none)';
        console.log(`  Portfolio "${portfolio.PlatformName}": Updated unique_id from "${oldId}" to "${uniqueId}"`);
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Total portfolios updated: ${totalUpdated}`);
    console.log(`Total portfolios skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run migration
addUniqueIdToConfigInputs().catch(console.error);

