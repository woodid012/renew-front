// app/api/output-asset-data/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'renew_assets');
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset_id');
    const period = searchParams.get('period');
    const uniqueId = searchParams.get('unique_id');
    
    console.log('[output-asset-data] Request received:', {
      assetId,
      period,
      uniqueId
    });

    const numericalFields = [
      'revenue',
      'contractedGreenRevenue',
      'contractedEnergyRevenue',
      'merchantGreenRevenue',
      'merchantEnergyRevenue',
      'monthlyGeneration',
      'avgGreenPrice',
      'avgEnergyPrice',
      'opex',
      'capex',
      'equity_capex',
      'debt_capex',
      'beginning_balance',
      'drawdowns',
      'interest',
      'principal',
      'ending_balance',
      'd_and_a',
      'cfads',
      'debt_service',
      'ebit',
      'ebt',
      'tax_expense',
      'net_income',
      'terminal_value',
      'equity_cash_flow',
      'equity_cash_flow_pre_distributions',
      'equity_injection',
      'cumulative_capex',
      'cumulative_d_and_a',
      'fixed_assets',
      'debt',
      'share_capital',
      'retained_earnings',
      'cash',
      'total_assets',
      'total_liabilities',
      'net_assets',
      'equity',
      'distributions',
      'dividends',
      'redistributed_capital',
    ];

    if (assetId) {
      let pipeline = [];

      // Get unique_id from query params (already retrieved above)
      console.log('[output-asset-data] Processing asset_id request:', {
        assetId,
        uniqueId,
        period
      });
      
      if (!uniqueId) {
        console.error('[output-asset-data] Missing unique_id parameter');
        return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
      }

      // Check if this is a hybrid asset by looking at config for the specific portfolio
      const { getPortfolioConfig } = await import('../utils/portfolio-helper');
      const configData = await getPortfolioConfig(db, uniqueId);
      
      if (!configData) {
        console.error('[output-asset-data] Portfolio not found for unique_id:', uniqueId);
        return NextResponse.json({ error: 'Portfolio not found for the provided unique_id' }, { status: 404 });
      }
      
      console.log('[output-asset-data] Portfolio config found:', {
        unique_id: configData.unique_id,
        PlatformName: configData.PlatformName,
        assetCount: configData.asset_inputs?.length || 0
      });
      let hybridGroup = null;
      let isHybrid = false;
      let componentAssetIds = [parseInt(assetId)];

      if (configData && configData.asset_inputs) {
        const asset = configData.asset_inputs.find(a => parseInt(a.id) === parseInt(assetId));
        if (asset && asset.hybridGroup) {
          // Find all assets in this hybrid group
          const groupAssets = configData.asset_inputs.filter(a => a.hybridGroup === asset.hybridGroup);
          if (groupAssets.length > 1) {
            hybridGroup = asset.hybridGroup;
            isHybrid = true;
            componentAssetIds = groupAssets.map(a => parseInt(a.id));
          }
        }
      }

      // If it's a hybrid asset, try to get the combined data first
      if (isHybrid && hybridGroup) {
        // Check if combined hybrid data exists (from backend processing)
        const hybridDataExists = await collection.findOne({
          hybrid_group: hybridGroup,
          asset_id: parseInt(assetId),
          unique_id: uniqueId
        });

        if (hybridDataExists) {
          // Use the pre-combined hybrid asset data
          pipeline.push({
            $match: {
              hybrid_group: hybridGroup,
              asset_id: parseInt(assetId),
              unique_id: uniqueId
            }
          });
        } else {
          // Combine on the fly by matching all component assets
          // We'll combine them in the period grouping stage
          pipeline.push({ $match: { asset_id: { $in: componentAssetIds }, unique_id: uniqueId } });
        }
      } else {
        // Regular asset - match by asset_id and unique_id
        pipeline.push({ $match: { asset_id: parseInt(assetId), unique_id: uniqueId } });
      }

      // Track if we need to combine hybrid assets on the fly
      const needsOnFlyCombination = isHybrid && hybridGroup && !hybridDataExists && componentAssetIds.length > 1;

      if (period === 'monthly') {
        // For hybrid assets combining on the fly, group by date only (not asset_id)
        const groupId = needsOnFlyCombination
          ? {
            year: { $year: '$date' },
            month: { $month: '$date' },
          }
          : {
            asset_id: '$asset_id',
            year: { $year: '$date' },
            month: { $month: '$date' },
          };

        pipeline.push({
          $group: {
            _id: groupId,
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });

        // Add asset_id back for hybrid assets combining on the fly
        if (needsOnFlyCombination) {
          pipeline.push({
            $addFields: {
              asset_id: parseInt(assetId)
            }
          });
        }

        pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1 } });
      } else if (period === 'quarterly') {
        const groupId = needsOnFlyCombination
          ? {
            year: { $year: '$date' },
            quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
          }
          : {
            asset_id: '$asset_id',
            year: { $year: '$date' },
            quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
          };

        pipeline.push({
          $group: {
            _id: groupId,
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });

        if (needsOnFlyCombination) {
          pipeline.push({
            $addFields: {
              asset_id: parseInt(assetId)
            }
          });
        }

        pipeline.push({ $sort: { '_id.year': 1, '_id.quarter': 1 } });
      } else if (period === 'yearly') {
        const groupId = needsOnFlyCombination
          ? {
            year: { $year: '$date' },
          }
          : {
            asset_id: '$asset_id',
            year: { $year: '$date' },
          };

        pipeline.push({
          $group: {
            _id: groupId,
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });

        if (needsOnFlyCombination) {
          pipeline.push({
            $addFields: {
              asset_id: parseInt(assetId)
            }
          });
        }

        pipeline.push({ $sort: { '_id.year': 1 } });
      } else if (period === 'fiscal_yearly') {
        const fiscalYearStartMonth = 7; // July as the start month for fiscal year

        // First, add fields to calculate fiscal year
        pipeline.push({
          $addFields: {
            fiscalYear: {
              $cond: {
                if: { $lt: [{ $month: '$date' }, fiscalYearStartMonth] },
                then: { $subtract: [{ $year: '$date' }, 1] },
                else: { $year: '$date' },
              },
            },
          },
        });

        // Then group by fiscal year
        const groupId = needsOnFlyCombination
          ? {
            fiscalYear: '$fiscalYear',
          }
          : {
            asset_id: '$asset_id',
            fiscalYear: '$fiscalYear',
          };

        pipeline.push({
          $group: {
            _id: groupId,
            date: { $first: '$date' },
            ...numericalFields.reduce((acc, field) => ({ ...acc, [field]: { $sum: `$${field}` } }), {}),
          },
        });

        if (needsOnFlyCombination) {
          pipeline.push({
            $addFields: {
              asset_id: parseInt(assetId)
            }
          });
        }

        pipeline.push({ $sort: { '_id.fiscalYear': 1 } });
      } else {
        // Default: return all documents sorted by date if no period or invalid period
        pipeline.push({ $sort: { date: 1 } });
      }

      const data = await collection.aggregate(pipeline).toArray();
      console.log('[output-asset-data] Query result:', {
        recordCount: data.length,
        sampleRecord: data[0] || null,
        assetId,
        uniqueId
      });
      
      return NextResponse.json({ data });
    } else {
      // Get unique_id from query params (already retrieved above)
      console.log('[output-asset-data] Processing list assets request:', {
        uniqueId
      });
      
      if (!uniqueId) {
        console.error('[output-asset-data] Missing unique_id parameter');
        return NextResponse.json({ error: 'unique_id parameter is required' }, { status: 400 });
      }

      // If no asset_id, return all unique asset_ids and names for this portfolio
      const { getPortfolioConfig } = await import('../utils/portfolio-helper');
      const portfolioConfig = await getPortfolioConfig(db, uniqueId);
      
      if (!portfolioConfig) {
        console.error('[output-asset-data] Portfolio not found for unique_id:', uniqueId);
        
        // List available unique_ids for debugging
        const allPortfolios = await db.collection('CONFIG_Inputs').find({}, { unique_id: 1, PlatformName: 1 }).limit(10).toArray();
        const availableUniqueIds = allPortfolios.map(p => ({
          unique_id: p.unique_id,
          PlatformName: p.PlatformName
        }));
        console.error('[output-asset-data] Available portfolios:', availableUniqueIds);
        
        return NextResponse.json({ 
          error: 'Portfolio not found for the provided unique_id',
          unique_id: uniqueId,
          available_portfolios: availableUniqueIds
        }, { status: 404 });
      }
      
      console.log('[output-asset-data] Portfolio config found:', {
        unique_id: portfolioConfig.unique_id,
        PlatformName: portfolioConfig.PlatformName,
        assetCount: portfolioConfig.asset_inputs?.length || 0
      });
      const portfolioAssetIds = portfolioConfig && portfolioConfig.asset_inputs
        ? portfolioConfig.asset_inputs.map(a => parseInt(a.id)).filter(id => !isNaN(id))
        : [];

      console.log('[output-asset-data] Portfolio config:', {
        unique_id: portfolioConfig.unique_id,
        PlatformName: portfolioConfig.PlatformName,
        portfolioAssetIdsCount: portfolioAssetIds.length,
        portfolioAssetIds: portfolioAssetIds
      });

      // Get unique asset IDs from cash flows that match this portfolio
      // First, just filter by unique_id to get all assets for this portfolio
      const cashflowQuery = { unique_id: uniqueId };
      
      console.log('[output-asset-data] Querying cash flows with:', {
        query: cashflowQuery,
        uniqueId: uniqueId,
        uniqueIdType: typeof uniqueId
      });
      
      // First check if any records exist with this unique_id
      const cashflowCount = await collection.countDocuments(cashflowQuery);
      console.log('[output-asset-data] Cash flow count for unique_id:', cashflowCount);
      
      if (cashflowCount === 0) {
        console.warn('[output-asset-data] No cash flows found for unique_id:', uniqueId);
        // Check if records exist with different unique_id format
        const sampleRecord = await collection.findOne({}, { unique_id: 1, asset_id: 1 });
        if (sampleRecord) {
          console.log('[output-asset-data] Sample record from collection:', {
            unique_id: sampleRecord.unique_id,
            unique_id_type: typeof sampleRecord.unique_id,
            asset_id: sampleRecord.asset_id
          });
        }
      }
      
      const uniqueAssetIdsFromCashFlows = await collection.distinct('asset_id', cashflowQuery);
      
      // Convert to integers for comparison (MongoDB may return mixed types)
      const uniqueAssetIdsInt = uniqueAssetIdsFromCashFlows.map(id => {
        if (typeof id === 'string') {
          const parsed = parseInt(id);
          return isNaN(parsed) ? null : parsed;
        }
        return typeof id === 'number' ? id : null;
      }).filter(id => id !== null);
      
      console.log('[output-asset-data] Found asset IDs in cash flows:', {
        uniqueAssetIdsFromCashFlows,
        uniqueAssetIdsFromCashFlowsTypes: uniqueAssetIdsFromCashFlows.map(id => typeof id),
        uniqueAssetIdsInt,
        count: uniqueAssetIdsInt.length
      });

      // Use the portfolio config we already fetched
      // If we have asset IDs from cash flows, filter by those. Otherwise, use all assets from config.
      // This handles cases where cash flows exist but the asset_id matching might have issues
      let assetData = [];
      
      if (portfolioConfig.asset_inputs && portfolioConfig.asset_inputs.length > 0) {
        if (uniqueAssetIdsInt.length > 0) {
          // We found cash flows - filter assets by those IDs
          assetData = portfolioConfig.asset_inputs
            .filter(asset => {
              const assetIdInt = parseInt(asset.id);
              if (isNaN(assetIdInt)) return false;
              return uniqueAssetIdsInt.includes(assetIdInt);
            })
            .map(asset => ({ 
              _id: parseInt(asset.id), 
              name: asset.name,
              hybridGroup: asset.hybridGroup
            }));
          
          console.log('[output-asset-data] Filtered assets by cash flow IDs:', {
            totalAssetsInConfig: portfolioConfig.asset_inputs.length,
            assetsInCashFlows: uniqueAssetIdsInt.length,
            assetsAfterFilter: assetData.length
          });
        } else {
          // No cash flows found - show all assets from config
          // This might happen if model hasn't been run yet, or if there's a data issue
          console.warn('[output-asset-data] No cash flows found for unique_id, showing all assets from config');
          assetData = portfolioConfig.asset_inputs
            .map(asset => ({ 
              _id: parseInt(asset.id), 
              name: asset.name,
              hybridGroup: asset.hybridGroup
            }))
            .filter(asset => !isNaN(asset._id));
        }
      }
      
      console.log('[output-asset-data] Filtered asset data from config:', {
        assetDataCount: assetData.length,
        assetData: assetData.map(a => ({ id: a._id, name: a.name })),
        hasCashFlows: uniqueAssetIdsInt.length > 0
      });

      // Check for hybrid groups in cashflow data (pre-combined hybrid assets)
      const hybridGroupsInCashflow = await collection.distinct('hybrid_group', { hybrid_group: { $exists: true, $ne: null } });

      // Build hybrid group mapping and identify which assets are in groups
      const hybridGroupMap = {};
      const assetsInHybridGroups = new Set();

      assetData.forEach(asset => {
        if (asset.hybridGroup) {
          if (!hybridGroupMap[asset.hybridGroup]) {
            hybridGroupMap[asset.hybridGroup] = [];
          }
          hybridGroupMap[asset.hybridGroup].push({
            _id: asset._id,
            name: asset.name
          });
          assetsInHybridGroups.add(asset._id);
        }
      });

      // Create a list that includes hybrid groups as combined assets
      // By default, show hybrid groups instead of individual components
      const displayAssets = [];
      const processedHybridGroups = new Set();

      assetData.forEach(asset => {
        if (asset.hybridGroup && hybridGroupMap[asset.hybridGroup] && !processedHybridGroups.has(asset.hybridGroup)) {
          // Add the hybrid group as a combined asset (use first asset ID as primary)
          const groupAssets = hybridGroupMap[asset.hybridGroup];
          const primaryAsset = groupAssets[0];
          displayAssets.push({
            _id: primaryAsset._id,
            name: `${asset.hybridGroup} (Hybrid)`,
            hybridGroup: asset.hybridGroup,
            isHybrid: true,
            componentIds: groupAssets.map(a => a._id),
            componentNames: groupAssets.map(a => a.name)
          });
          processedHybridGroups.add(asset.hybridGroup);
        } else if (!asset.hybridGroup || !assetsInHybridGroups.has(asset._id)) {
          // Add non-hybrid assets or individual components (when not grouped)
          displayAssets.push({
            _id: asset._id,
            name: asset.name,
            hybridGroup: asset.hybridGroup || null,
            isHybrid: false
          });
        }
      });

      console.log('[output-asset-data] Returning asset list:', {
        displayAssetsCount: displayAssets.length,
        displayAssets: displayAssets.map(a => ({ id: a._id, name: a.name }))
      });
      
      return NextResponse.json({
        uniqueAssetIds: displayAssets,
        hybridGroups: hybridGroupMap,
        allAssets: assetData // Include all individual assets for reference
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}