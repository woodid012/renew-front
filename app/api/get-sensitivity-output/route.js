import clientPromise from '../../../lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('SENS_Summary_Main');

        const { searchParams } = new URL(request.url);
        const scenarioId = searchParams.get('scenario_id');

        let query = {};
        if (scenarioId) {
            query = { scenario_id: scenarioId };
        }

        const data = await collection.find(query).toArray();

        // Get unique scenario IDs for the dropdown
        const uniqueScenarioIds = await collection.distinct('scenario_id');

        return NextResponse.json({ data, uniqueScenarioIds });
    } catch (error) {
        console.error('Failed to fetch sensitivity data:', error);
        return NextResponse.json({ message: 'Failed to fetch sensitivity data', error: error.message }, { status: 500 });
    }
}
