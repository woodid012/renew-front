import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('PRICE_Curves');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    let pipeline = [];

    // Stage to ensure TIME is a Date object. If it's a string, convert it.
    pipeline.push({
      $addFields: {
        TIME: {
          $cond: {
            if: { $type: "$TIME" },
            then: "$TIME",
            else: { $toDate: "$TIME" } // Attempt to convert if it's a string
          }
        }
      }
    });

    // Add fields for individual spread durations for easier aggregation
    pipeline.push({
      $addFields: {
        'SPREAD_0_5HR': '$SPREAD.0.5HR',
        'SPREAD_1HR': '$SPREAD.1HR',
        'SPREAD_2HR': '$SPREAD.2HR',
        'SPREAD_4HR': '$SPREAD.4HR',
      }
    });

    const fiscalYearStartMonth = 7; // Assuming July as the start month for fiscal year

    let groupStage = {
      _id: {
        REGION: '$REGION',
        PROFILE: '$PROFILE',
        TYPE: '$TYPE',
      },
      TIME: { $first: '$TIME' },
      PRICE: {
        $avg: {
          $cond: [
            {
              $or: [
                { $ne: ['$PROFILE', 'baseload'] }, // Not a baseload profile
                { $ne: ['$TYPE', 'ENERGY'] },     // Not an ENERGY type
                { $eq: ['$SPREAD', {}] }          // SPREAD is empty (no spread data)
              ]
            },
            '$PRICE', // Include PRICE in average
            null      // Exclude PRICE from average
          ]
        }
      },
      // Aggregate spreads
      'SPREAD_0_5HR': { $avg: '$SPREAD_0_5HR' },
      'SPREAD_1HR': { $avg: '$SPREAD_1HR' },
      'SPREAD_2HR': { $avg: '$SPREAD_2HR' },
      'SPREAD_4HR': { $avg: '$SPREAD_4HR' },
    };

    let sortStage = {};

    if (period === 'monthly') {
      groupStage._id.year = { $year: '$TIME' };
      groupStage._id.month = { $month: '$TIME' };
      sortStage = { '_id.year': 1, '_id.month': 1 };
    } else if (period === 'quarterly') {
      groupStage._id.year = { $year: '$TIME' };
      groupStage._id.quarter = { $ceil: { $divide: [{ $month: '$TIME' }, 3] } };
      sortStage = { '_id.year': 1, '_id.quarter': 1 };
    } else if (period === 'yearly') {
      groupStage._id.year = { $year: '$TIME' };
      sortStage = { '_id.year': 1 };
    } else if (period === 'fiscal_yearly') {
      // Project fiscal year first, including spread fields
      pipeline.push({
        $project: {
          _id: 0,
          TIME: '$TIME',
          PRICE: '$PRICE',
          REGION: '$REGION',
          PROFILE: '$PROFILE',
          TYPE: '$TYPE',
          'SPREAD_0_5HR': '$SPREAD_0_5HR',
          'SPREAD_1HR': '$SPREAD_1HR',
          'SPREAD_2HR': '$SPREAD_2HR',
          'SPREAD_4HR': '$SPREAD_4HR',
          fiscalYear: {
            $cond: {
              if: { $lt: [{ $month: '$TIME' }, fiscalYearStartMonth] },
              then: { $subtract: [{ $year: '$TIME' }, 1] },
              else: { $year: '$TIME' },
            },
          },
        },
      });
      groupStage._id.fiscalYear = '$fiscalYear';
      sortStage = { '_id.fiscalYear': 1 };
    } else {
      // Default: no aggregation, just sort by TIME
      pipeline.push({ $sort: { TIME: 1 } });
      // No grouping, so return directly
      const data = await collection.aggregate(pipeline).toArray();
      return NextResponse.json(data);
    }

    pipeline.push({ $group: groupStage });
    pipeline.push({ $sort: sortStage });

    const data = await collection.aggregate(pipeline).toArray();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching price curves directly from MongoDB:', error);
    return NextResponse.json({ message: 'Error fetching price curves', error: error.message }, { status: 500 });
  }
}