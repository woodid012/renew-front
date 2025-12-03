import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const variablesStr = searchParams.get('variables');
    const granularity = searchParams.get('granularity');
    const collectionName = searchParams.get('collection') === 'sensitivity' ? 'SENS_Asset_Outputs' : 'ASSET_cash_flows';
    const scenarioId = searchParams.get('scenario_id');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const cashFlowCollection = db.collection(collectionName);

    let query = {};
    if (scenarioId) {
      query.scenario_id = scenarioId;
    }
    if (assetId) {
      try {
        const assetIdInt = parseInt(assetId);
        query = { asset_id: assetIdInt };
      } catch (e) {
        query = { asset_id: assetId };
      }
    }

    const data = await cashFlowCollection.find(query).toArray();

    if (data.length > 0) {
      let processedData = data.map(doc => ({
        ...doc,
        date: new Date(doc.date) // Convert date strings to Date objects
      }));

      // Filter variables if specified
      if (variablesStr) {
        const variables = variablesStr.split(',').map(v => v.trim());
        const colsToKeep = new Set(['date', 'asset_id', ...variables]);
        processedData = processedData.map(doc => {
          const newDoc = {};
          for (const key of colsToKeep) {
            if (doc.hasOwnProperty(key)) {
              newDoc[key] = doc[key];
            }
          }
          return newDoc;
        });
      }

      // Aggregate by granularity
      const aggregatedData = {};

      processedData.forEach(doc => {
        let periodKey;
        let periodDate;

        if (granularity === 'quarterly') {
          const year = doc.date.getFullYear();
          const quarter = Math.floor(doc.date.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
          periodDate = new Date(year, (quarter - 1) * 3, 1);
        } else if (granularity === 'yearly') {
          const year = doc.date.getFullYear();
          periodKey = `${year}`;
          periodDate = new Date(year, 0, 1);
        } else { // Monthly or default
          const year = doc.date.getFullYear();
          const month = doc.date.getMonth();
          periodKey = `${year}-${month}`;
          periodDate = new Date(year, month, 1);
        }

        const groupKey = `${doc.asset_id}-${periodKey}`;

        if (!aggregatedData[groupKey]) {
          aggregatedData[groupKey] = {
            asset_id: doc.asset_id,
            date: periodDate,
          };
          // Initialize numeric variables to 0
          for (const key in doc) {
            if (typeof doc[key] === 'number') {
              aggregatedData[groupKey][key] = 0;
            }
          }
        }

        // Sum numeric values
        for (const key in doc) {
          if (typeof doc[key] === 'number' && key !== 'asset_id') {
            aggregatedData[groupKey][key] += doc[key];
          }
        }
      });

      let resultData = Object.values(aggregatedData);

      // Sort by asset_id and date
      resultData.sort((a, b) => {
        if (a.asset_id !== b.asset_id) {
          return a.asset_id - b.asset_id;
        }
        return a.date.getTime() - b.date.getTime();
      });

      // Format dates back to string
      resultData = resultData.map(doc => ({
        ...doc,
        date: doc.date.toISOString().split('T')[0]
      }));

      return NextResponse.json(resultData);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data for export', details: error.message },
      { status: 500 }
    );
  }
}
