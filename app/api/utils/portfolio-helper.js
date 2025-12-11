// app/api/utils/portfolio-helper.js
// Helper function to get asset IDs for a given portfolio by unique_id

export async function getPortfolioAssetIds(db, uniqueId) {
  try {
    if (!uniqueId) {
      console.log('Portfolio helper - unique_id is required');
      return [];
    }
    
    const uniqueIdTrimmed = uniqueId.trim();
    
    // Find by unique_id only
    const configDoc = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: uniqueIdTrimmed 
    });
    
    if (!configDoc) {
      console.log(`Portfolio helper - No CONFIG_Inputs document found for unique_id: ${uniqueIdTrimmed}`);
      // List available unique_ids for debugging
      const allPortfolios = await db.collection('CONFIG_Inputs').find({}).toArray();
      const availableUniqueIds = allPortfolios.map(p => p.unique_id).filter(Boolean);
      console.log(`Portfolio helper - Available unique_ids: [${availableUniqueIds.join(', ')}]`);
      return [];
    }
    
    if (!configDoc.asset_inputs || configDoc.asset_inputs.length === 0) {
      console.log(`Portfolio helper - Portfolio (unique_id: ${configDoc.unique_id}) has no assets`);
      return [];
    }
    
    // Extract asset IDs from the portfolio
    const assetIds = configDoc.asset_inputs
      .map(asset => parseInt(asset.id))
      .filter(id => !isNaN(id));
    
    console.log(`Portfolio helper - Portfolio (unique_id: ${configDoc.unique_id}) has ${assetIds.length} assets: [${assetIds.join(', ')}]`);
    return assetIds;
  } catch (error) {
    console.error('Error getting portfolio asset IDs:', error);
    return [];
  }
}

// Helper function to get portfolio config by unique_id
export async function getPortfolioConfig(db, uniqueId) {
  try {
    if (!uniqueId) {
      return null;
    }
    
    const uniqueIdTrimmed = uniqueId.trim();
    
    // Find by unique_id only
    const configDoc = await db.collection('CONFIG_Inputs').findOne({ 
      unique_id: uniqueIdTrimmed 
    });
    
    return configDoc;
  } catch (error) {
    console.error('Error getting portfolio config:', error);
    return null;
  }
}

