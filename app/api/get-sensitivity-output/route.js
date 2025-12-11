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

        let query = {};
        if (scenarioId) {
            query.scenario_id = scenarioId;
        }
        
        // Filter by unique_id (primary identifier) instead of PlatformName
        // Check if unique_id field exists in the collection
        const hasUniqueIdField = await collection.countDocuments({ 
            unique_id: { $exists: true }
        }, { limit: 1 });
        
        console.log(`Sensitivity API - Checking collection for unique_id field. Has unique_id field: ${hasUniqueIdField > 0}`);
        
        if (hasUniqueIdField > 0) {
            query.unique_id = uniqueId;
            console.log(`Sensitivity API - Filtering by unique_id: ${uniqueId} (display name: ${actualPortfolioName})`);
            
            // Also check if there are any records with this unique_id
            const countWithUniqueId = await collection.countDocuments(query);
            console.log(`Sensitivity API - Found ${countWithUniqueId} records with unique_id: ${uniqueId}`);
            
            // If no records found with unique_id, try without unique_id filter to see what's in the collection
            if (countWithUniqueId === 0) {
                const sampleRecord = await collection.findOne({});
                console.log(`Sensitivity API - Sample record in collection:`, sampleRecord ? Object.keys(sampleRecord) : 'No records found');
                if (sampleRecord && sampleRecord.unique_id) {
                    console.log(`Sensitivity API - Sample record unique_id: ${sampleRecord.unique_id}`);
                }
            }
        } else {
            // Fallback: check for portfolio_name or PlatformName fields for backward compatibility
            const hasPortfolioField = await collection.countDocuments({ 
                $or: [
                    { portfolio_name: { $exists: true } },
                    { PlatformName: { $exists: true } }
                ]
            }, { limit: 1 });
            
            if (hasPortfolioField > 0) {
                const sampleWithPortfolio = await collection.findOne({
                    $or: [
                        { portfolio_name: { $exists: true } },
                        { PlatformName: { $exists: true } }
                    ]
                });
                
                if (sampleWithPortfolio) {
                    const portfolioField = sampleWithPortfolio.portfolio_name !== undefined ? 'portfolio_name' : 'PlatformName';
                    query[portfolioField] = actualPortfolioName;
                    console.log(`Sensitivity API - Filtering by ${portfolioField} (fallback): ${actualPortfolioName} (unique_id: ${uniqueId})`);
                }
            } else {
                console.log(`Sensitivity API - WARNING: No unique_id/portfolio_name/PlatformName field found in collection. Will filter by asset IDs only.`);
                // Don't add any portfolio filter - will rely on asset ID filtering only
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
            
            // If no data found with the query, try without any portfolio filter (just get all data and filter by asset IDs)
            if (allData.length === 0 && Object.keys(query).length > (scenarioId ? 1 : 0)) {
                console.log(`Sensitivity API - No data found with portfolio filter, trying without portfolio filter...`);
                const queryWithoutPortfolio = scenarioId ? { scenario_id: scenarioId } : {};
                const allDataWithoutFilter = await collection.find(queryWithoutPortfolio).limit(100).toArray();
                console.log(`Sensitivity API - Found ${allDataWithoutFilter.length} records without portfolio filter`);
                if (allDataWithoutFilter.length > 0) {
                    // Use the unfiltered data
                    allData.push(...allDataWithoutFilter);
                }
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
