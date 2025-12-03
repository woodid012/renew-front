// app/api/utils/portfolio-helper.js
// Helper function to get asset IDs for a given portfolio

export async function getPortfolioAssetIds(db, portfolio) {
  try {
    const portfolioName = portfolio?.trim() || 'ZEBRE';
    
    // Find the CONFIG_Inputs document for this portfolio
    // Try exact match first, then case-insensitive if not found
    let configDoc = await db.collection('CONFIG_Inputs').findOne({ 
      PlatformName: portfolioName 
    });
    
    // If not found, try case-insensitive search
    if (!configDoc) {
      const allPortfolios = await db.collection('CONFIG_Inputs').find({}).toArray();
      const matchingPortfolio = allPortfolios.find(p => 
        p.PlatformName && p.PlatformName.toLowerCase() === portfolioName.toLowerCase()
      );
      if (matchingPortfolio) {
        configDoc = matchingPortfolio;
        console.log(`Portfolio helper - Found portfolio with case mismatch: "${matchingPortfolio.PlatformName}" (searched for "${portfolioName}")`);
      }
    }
    
    if (!configDoc) {
      console.log(`Portfolio helper - No CONFIG_Inputs document found for portfolio: ${portfolioName}`);
      // List available portfolios for debugging
      const allPortfolios = await db.collection('CONFIG_Inputs').find({}).toArray();
      const availableNames = allPortfolios.map(p => p.PlatformName).filter(Boolean);
      console.log(`Portfolio helper - Available portfolios: [${availableNames.join(', ')}]`);
      return [];
    }
    
    if (!configDoc.asset_inputs || configDoc.asset_inputs.length === 0) {
      console.log(`Portfolio helper - Portfolio ${configDoc.PlatformName} has no assets`);
      return [];
    }
    
    // Extract asset IDs from the portfolio
    const assetIds = configDoc.asset_inputs
      .map(asset => parseInt(asset.id))
      .filter(id => !isNaN(id));
    
    console.log(`Portfolio helper - Portfolio ${configDoc.PlatformName} has ${assetIds.length} assets: [${assetIds.join(', ')}]`);
    return assetIds;
  } catch (error) {
    console.error('Error getting portfolio asset IDs:', error);
    return [];
  }
}

