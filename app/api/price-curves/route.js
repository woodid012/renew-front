import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('PRICE_Curves_2'); // Targeting the new collection

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    let pipeline = [];

    // Stage to ensure TIME is a Date object. If it's a string, convert it.
    // Handle null/missing TIME values properly
    pipeline.push({
      $addFields: {
        TIME: {
          $cond: {
            if: { $eq: [{ $type: "$TIME" }, "date"] },
            then: "$TIME",
            else: {
              $cond: {
                if: { $eq: [{ $type: "$TIME" }, "string"] },
                then: { $toDate: "$TIME" },
                else: "$TIME" // Keep as is if null or other type
              }
            }
          }
        }
      }
    });

    const curveName = searchParams.get('curve_name') || 'AC Nov 2024';
    pipeline.push({
      $match: { curve_name: curveName }
    });


    const fiscalYearStartMonth = 7; // Assuming July as the start month for fiscal year

    let groupStage = {
      _id: {
        REGION: '$REGION',
        PROFILE: '$PROFILE',
        TYPE: '$TYPE',
      },
      TIME: { $first: '$TIME' },
      PRICE: { $avg: '$PRICE' },
    };

    let sortStage = {};

    if (period === 'monthly') {
      // For GREEN_YEARLY records, expand to monthly by creating 12 entries (one per month) with same price
      // For other records, use TIME field as normal
      pipeline.push({
        $facet: {
          greenYearly: [
            { $match: { TYPE: 'GREEN_YEARLY' } },
            {
              $project: {
                REGION: 1,
                PROFILE: 1,
                TYPE: 1,
                PRICE: 1,
                YEAR: 1,
                months: { $range: [1, 13] } // Array [1, 2, ..., 12]
              }
            },
            { $unwind: '$months' },
            {
              $project: {
                REGION: 1,
                PROFILE: 1,
                TYPE: 1,
                PRICE: 1,
                TIME: {
                  $dateFromParts: {
                    year: '$YEAR',
                    month: '$months',
                    day: 1
                  }
                }
              }
            }
          ],
          regular: [
            { $match: { TYPE: { $ne: 'GREEN_YEARLY' } } }
          ]
        }
      });
      pipeline.push({
        $project: {
          combined: { $concatArrays: ['$greenYearly', '$regular'] }
        }
      });
      pipeline.push({ $unwind: '$combined' });
      pipeline.push({
        $replaceRoot: { newRoot: '$combined' }
      });
      // Re-add TIME conversion after expansion
      pipeline.push({
        $addFields: {
          TIME: {
            $cond: {
              if: { $eq: [{ $type: "$TIME" }, "date"] },
              then: "$TIME",
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$TIME" }, "string"] },
                  then: { $toDate: "$TIME" },
                  else: "$TIME"
                }
              }
            }
          }
        }
      });
      groupStage._id.year = { $year: '$TIME' };
      groupStage._id.month = { $month: '$TIME' };
      sortStage = { '_id.year': 1, '_id.month': 1 };
    } else if (period === 'quarterly') {
      // For GREEN_YEARLY records, expand to quarterly by creating 4 entries (one per quarter) with same price
      // For other records, use TIME field as normal
      pipeline.push({
        $facet: {
          greenYearly: [
            { $match: { TYPE: 'GREEN_YEARLY' } },
            {
              $project: {
                REGION: 1,
                PROFILE: 1,
                TYPE: 1,
                PRICE: 1,
                YEAR: 1,
                quarters: [1, 2, 3, 4] // Array [1, 2, 3, 4]
              }
            },
            { $unwind: '$quarters' },
            {
              $project: {
                REGION: 1,
                PROFILE: 1,
                TYPE: 1,
                PRICE: 1,
                TIME: {
                  $dateAdd: {
                    startDate: {
                      $dateFromParts: {
                        year: '$YEAR',
                        month: 1,
                        day: 1
                      }
                    },
                    unit: 'month',
                    amount: { $multiply: [{ $subtract: ['$quarters', 1] }, 3] }
                  }
                }
              }
            }
          ],
          regular: [
            { $match: { TYPE: { $ne: 'GREEN_YEARLY' } } }
          ]
        }
      });
      pipeline.push({
        $project: {
          combined: { $concatArrays: ['$greenYearly', '$regular'] }
        }
      });
      pipeline.push({ $unwind: '$combined' });
      pipeline.push({
        $replaceRoot: { newRoot: '$combined' }
      });
      // Re-add TIME conversion after expansion
      pipeline.push({
        $addFields: {
          TIME: {
            $cond: {
              if: { $eq: [{ $type: "$TIME" }, "date"] },
              then: "$TIME",
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$TIME" }, "string"] },
                  then: { $toDate: "$TIME" },
                  else: "$TIME"
                }
              }
            }
          }
        }
      });
      groupStage._id.year = { $year: '$TIME' };
      groupStage._id.quarter = { $ceil: { $divide: [{ $month: '$TIME' }, 3] } };
      sortStage = { '_id.year': 1, '_id.quarter': 1 };
    } else if (period === 'yearly') {
      // For GREEN_YEARLY records, use YEAR field directly; for others, extract from TIME
      groupStage._id.year = {
        $cond: {
          if: { $eq: ['$TYPE', 'GREEN_YEARLY'] },
          then: '$YEAR',
          else: { $year: '$TIME' }
        }
      };
      sortStage = { '_id.year': 1 };
    } else if (period === 'fiscal_yearly') {
      // For GREEN_YEARLY records, use YEAR field directly; for others, calculate fiscal year from TIME
      pipeline.push({
        $project: {
          _id: 0,
          TIME: '$TIME',
          PRICE: '$PRICE',
          REGION: '$REGION',
          PROFILE: '$PROFILE',
          TYPE: '$TYPE',
          YEAR: '$YEAR', // Keep YEAR field for GREEN_YEARLY records
          fiscalYear: {
            $cond: {
              if: { $eq: ['$TYPE', 'GREEN_YEARLY'] },
              then: '$YEAR', // For GREEN_YEARLY, YEAR is already the fiscal year ending year
              else: {
                $cond: {
                  if: { $lt: [{ $month: '$TIME' }, fiscalYearStartMonth] },
                  then: { $subtract: [{ $year: '$TIME' }, 1] },
                  else: { $year: '$TIME' },
                }
              }
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