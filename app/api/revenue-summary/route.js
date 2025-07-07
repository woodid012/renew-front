import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('renew_assets');
    const collection = db.collection('ASSET_cash_flows');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'yearly'; // Default to yearly

    let pipeline = [];
    let groupStageId = {};
    let sortStage = {};

    const fiscalYearStartMonth = 7; // July as the start month for fiscal year

    if (period === 'monthly') {
      groupStageId = {
        year: { $year: '$date' },
        month: { $month: '$date' },
      };
      sortStage = { '_id.year': 1, '_id.month': 1 };
    } else if (period === 'quarterly') {
      groupStageId = {
        year: { $year: '$date' },
        quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
      };
      sortStage = { '_id.year': 1, '_id.quarter': 1 };
    } else if (period === 'yearly') {
      groupStageId = {
        year: { $year: '$date' },
      };
      sortStage = { '_id.year': 1 };
    } else if (period === 'fiscal_yearly') {
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
        
        groupStageId = {
            fiscalYear: '$fiscalYear',
        };
        sortStage = { '_id.fiscalYear': 1 };
    } else {
      return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
    }

    pipeline.push({
      $group: {
        _id: { ...groupStageId, asset_id: '$asset_id' },
        totalRevenue: { $sum: '$revenue' },
      },
    });

    pipeline.push({ $sort: sortStage });

    const data = await collection.aggregate(pipeline).toArray();

    // Transform data for easier consumption by frontend (group by period, then by asset)
    const transformedData = {};
    data.forEach(item => {
      let periodKey;
      if (period === 'monthly') {
        periodKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else if (period === 'quarterly') {
        periodKey = `${item._id.year}-Q${item._id.quarter}`;
      } else if (period === 'yearly') {
        periodKey = `${item._id.year}`;
      } else if (period === 'fiscal_yearly') {
        periodKey = `FY${item._id.fiscalYear}`;
      }

      if (!transformedData[periodKey]) {
        transformedData[periodKey] = {};
      }
      transformedData[periodKey][item._id.asset_id] = item.totalRevenue;
    });

    // Convert to array of objects for Recharts BarChart
    const finalData = Object.keys(transformedData).map(periodKey => ({
      period: periodKey,
      ...transformedData[periodKey]
    }));

    return NextResponse.json(finalData);

  } catch (error) {
    console.error('Error fetching revenue summary data:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue summary data' }, { status: 500 });
  }
}