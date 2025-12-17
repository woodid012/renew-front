
import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('PRICE_Curves_2');

    const curveNames = await collection.distinct('curve_name');

    // Sort, ensuring "AC Nov 2024" is first if it exists
    curveNames.sort((a, b) => {
      if (a === 'AC Nov 2024') return -1;
      if (b === 'AC Nov 2024') return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({ curveNames });
  } catch (error) {
    console.error('Error fetching price curve metadata:', error);
    return NextResponse.json({ message: 'Error fetching price curve metadata', error: error.message }, { status: 500 });
  }
}
