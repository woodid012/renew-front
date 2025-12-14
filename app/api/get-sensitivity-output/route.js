import clientPromise from '../../../lib/mongodb';
import { NextResponse } from 'next/server';
import { getPortfolioAssetIds, getPortfolioConfig } from '../utils/portfolio-helper';

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('SENS_Summary_Main');

        const { searchParams } = new URL(request.url);
        const scenarioId = searchParams.get('scenario_id');
        const uniqueId = searchParams.get('unique_id');

        if (!uniqueId) {
            return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
        }

        // Get portfolio config to get the actual portfolio name (for display only)
        const portfolioConfig = await getPortfolioConfig(db, uniqueId);
        if (!portfolioConfig) {
            return NextResponse.json({ error: 'Portfolio not found for the provided unique_id' }, { status: 404 });
        }
        const actualPortfolioName = portfolioConfig.PlatformName; // For display/logging only

        // Get asset IDs for this portfolio
        const portfolioAssetIds = await getPortfolioAssetIds(db, uniqueId);

        // Build query that checks for EITHER unique_id OR portfolio name/portfolio_name/PlatformName
        // This handles both new data (with unique_id) and old data (with portfolio name only)
        let query = {};
        
        // Check what fields exist in the collection by sampling a record
        const sampleRecord = await collection.findOne({});
        const hasUniqueId = sampleRecord && sampleRecord.unique_id !== undefined;
        const hasPortfolioName = sampleRecord && sampleRecord.portfolio_name !== undefined;
        const hasPlatformName = sampleRecord && sampleRecord.PlatformName !== undefined;
        const hasPortfolio = sampleRecord && sampleRecord.portfolio !== undefined;
        
        // Build $or condition for portfolio identifier
        // ALWAYS prioritize unique_id filter when provided (don't rely on sample record check)
        const portfolioConditions = [];
        // Always add unique_id filter first (highest priority)
        portfolioConditions.push({ unique_id: uniqueId });
        if (hasPortfolioName) {
            portfolioConditions.push({ portfolio_name: actualPortfolioName });
        }
        if (hasPlatformName) {
            portfolioConditions.push({ PlatformName: actualPortfolioName });
        }
        if (hasPortfolio) {
            portfolioConditions.push({ portfolio: actualPortfolioName });
        }
        
        // Build the query with $and to combine scenario_id (if provided) with portfolio conditions
        const queryConditions = [];
        if (scenarioId) {
            queryConditions.push({ scenario_id: scenarioId });
        }
        if (portfolioConditions.length > 0) {
            queryConditions.push({ $or: portfolioConditions });
            console.log(`Sensitivity API - Filtering by: ${portfolioConditions.map(c => Object.keys(c)[0]).join(' OR ')} for unique_id: ${uniqueId} (portfolio name: ${actualPortfolioName})`);
        } else {
            console.log(`Sensitivity API - WARNING: No portfolio identifier fields found in collection. Will filter by asset IDs only.`);
        }
        
        if (queryConditions.length > 0) {
            if (queryConditions.length === 1) {
                query = queryConditions[0];
            } else {
                query = { $and: queryConditions };
            }
        }
        
        // Filter sensitivity data by portfolio asset IDs
        // Sensitivity data has asset_id fields like asset_1_irr_pct, asset_2_irr_pct, etc.
        // We need to filter to only include data for assets in this portfolio
        if (portfolioAssetIds.length > 0) {
            // Build a query that matches any asset in the portfolio
            // Since sensitivity data structure uses asset_<id>_* fields, we'll filter after fetching
            const allData = await collection.find(query).toArray();
            
            console.log(`Sensitivity API - Portfolio: ${actualPortfolioName} (unique_id: ${uniqueId}), Asset IDs: [${portfolioAssetIds.join(', ')}], Query:`, JSON.stringify(query), `Total rows before filtering: ${allData.length}`);
            
            // IMPORTANT: Always respect the unique_id filter - do NOT fall back to unfiltered data
            // If no data is found with the portfolio filter, return empty results
            // This ensures data is properly filtered by unique_id
            if (allData.length === 0) {
                console.log(`Sensitivity API - No data found with portfolio filter for unique_id: ${uniqueId} (portfolio: ${actualPortfolioName}). Returning empty results.`);
            }
            
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
            
            console.log(`Sensitivity API - Filtered to ${filteredData.length} rows for portfolio ${actualPortfolioName} (unique_id: ${uniqueId})`);
            
            // Get unique scenario IDs from filtered data
            const uniqueScenarioIds = [...new Set(filteredData.map(item => item.scenario_id).filter(Boolean))];
            
            // Use the portfolio config we already fetched
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
            console.log(`Sensitivity API - Portfolio ${actualPortfolioName} (unique_id: ${uniqueId}) has no assets, returning empty`);
            return NextResponse.json({ data: [], uniqueScenarioIds: [], assetNames: {} });
        }
    } catch (error) {
        console.error('Failed to fetch sensitivity data:', error);
        return NextResponse.json({ message: 'Failed to fetch sensitivity data', error: error.message }, { status: 500 });
    }
}
