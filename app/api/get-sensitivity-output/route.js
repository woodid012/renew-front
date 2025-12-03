import clientPromise from '../../../lib/mongodb';
import { NextResponse } from 'next/server';
import { getPortfolioAssetIds } from '../utils/portfolio-helper';

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('SENS_Summary_Main');

        const { searchParams } = new URL(request.url);
        const scenarioId = searchParams.get('scenario_id');
        const portfolio = searchParams.get('portfolio') || 'ZEBRE';

        // Get asset IDs for this portfolio
        const portfolioAssetIds = await getPortfolioAssetIds(db, portfolio);

        let query = {};
        if (scenarioId) {
            query.scenario_id = scenarioId;
        }
        
        // Filter sensitivity data by portfolio asset IDs
        // Sensitivity data has asset_id fields like asset_1_irr_pct, asset_2_irr_pct, etc.
        // We need to filter to only include data for assets in this portfolio
        if (portfolioAssetIds.length > 0) {
            // Build a query that matches any asset in the portfolio
            // Since sensitivity data structure uses asset_<id>_* fields, we'll filter after fetching
            const allData = await collection.find(query).toArray();
            
            console.log(`Sensitivity API - Portfolio: ${portfolio}, Asset IDs: [${portfolioAssetIds.join(', ')}], Total rows: ${allData.length}`);
            
            // Filter to only include rows that have data for assets in this portfolio
            // IMPORTANT: Only include rows where at least one asset from THIS portfolio has data
            // Also filter out any asset fields that are NOT in this portfolio
            const filteredData = allData.filter(item => {
                // Check if any asset in the portfolio has data in this row
                const hasPortfolioAssetData = portfolioAssetIds.some(assetId => {
                    // Check for various asset fields in sensitivity data
                    return item[`asset_${assetId}_irr_pct`] !== undefined ||
                           item[`asset_${assetId}_irr_diff_bps`] !== undefined ||
                           item[`asset_${assetId}_npv`] !== undefined ||
                           item[`asset_${assetId}_npv_diff`] !== undefined;
                });
                
                return hasPortfolioAssetData;
            }).map(item => {
                // Create a new object with only portfolio assets' data
                const filteredItem = { ...item };
                
                // Remove asset fields that are NOT in this portfolio
                Object.keys(filteredItem).forEach(key => {
                    const assetMatch = key.match(/^asset_(\d+)_/);
                    if (assetMatch) {
                        const assetId = parseInt(assetMatch[1]);
                        if (!portfolioAssetIds.includes(assetId)) {
                            delete filteredItem[key];
                        }
                    }
                });
                
                return filteredItem;
            });
            
            console.log(`Sensitivity API - Filtered to ${filteredData.length} rows for portfolio ${portfolio}`);
            
            // Get unique scenario IDs from filtered data
            const uniqueScenarioIds = [...new Set(filteredData.map(item => item.scenario_id).filter(Boolean))];
            
            // Get asset names from CONFIG_Inputs for this portfolio
            const configCollection = db.collection('CONFIG_Inputs');
            const portfolioConfig = await configCollection.findOne({ PlatformName: portfolio.trim() });
            const assetNameMap = {};
            
            if (portfolioConfig && portfolioConfig.asset_inputs) {
                portfolioConfig.asset_inputs.forEach(asset => {
                    if (asset.id && asset.name) {
                        // Store with both string and number keys for flexibility
                        const assetId = parseInt(asset.id);
                        if (!isNaN(assetId)) {
                            assetNameMap[assetId] = asset.name;
                            assetNameMap[String(assetId)] = asset.name;
                        }
                    }
                });
            }
            
            return NextResponse.json({ 
                data: filteredData, 
                uniqueScenarioIds,
                assetNames: assetNameMap 
            });
        } else {
            // No assets in portfolio, return empty
            console.log(`Sensitivity API - Portfolio ${portfolio} has no assets, returning empty`);
            return NextResponse.json({ data: [], uniqueScenarioIds: [], assetNames: {} });
        }
    } catch (error) {
        console.error('Failed to fetch sensitivity data:', error);
        return NextResponse.json({ message: 'Failed to fetch sensitivity data', error: error.message }, { status: 500 });
    }
}
