// app/api/asset-defaults/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const COLLECTION_NAME = 'CONFIG_Asset_Defaults';

export async function GET() {
    try {
        let client;
        try {
            client = await clientPromise;
        } catch (mongoError) {
            console.error('MongoDB connection error:', mongoError);
            return NextResponse.json(
                { 
                    error: 'MongoDB connection failed',
                    hint: 'Please check your MONGODB_URI environment variable in .env.local'
                },
                { status: 500 }
            );
        }

        const dbName = process.env.MONGODB_DB || 'renew_assets';
        const db = client.db(dbName);
        const collection = db.collection(COLLECTION_NAME);

        // Get the defaults document (should be a single document)
        const defaults = await collection.findOne({});

        if (!defaults) {
            // If no document exists, return error suggesting initialization
            return NextResponse.json(
                { 
                    error: 'Asset defaults not found in MongoDB. Please run initialization script.',
                    needsInitialization: true,
                    hint: 'Run: python scripts/initialize_asset_defaults_mongo.py'
                },
                { status: 404 }
            );
        }

        // Remove MongoDB _id field before returning
        const { _id, ...defaultsWithoutId } = defaults;
        return NextResponse.json(defaultsWithoutId);
    } catch (error) {
        console.error('Error reading asset defaults from MongoDB:', error);
        return NextResponse.json(
            { error: 'Failed to read asset defaults from MongoDB', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const defaults = await request.json();

        // Validate the structure
        if (!defaults.assetDefaults || !defaults.platformDefaults) {
            return NextResponse.json(
                { error: 'Invalid defaults structure' },
                { status: 400 }
            );
        }

        // Update metadata
        defaults.metadata = {
            ...defaults.metadata,
            lastUpdated: new Date().toISOString(),
            version: defaults.metadata?.version || '1.0.0'
        };

        let client;
        try {
            client = await clientPromise;
        } catch (mongoError) {
            console.error('MongoDB connection error:', mongoError);
            return NextResponse.json(
                { 
                    error: 'MongoDB connection failed',
                    hint: 'Please check your MONGODB_URI environment variable in .env.local'
                },
                { status: 500 }
            );
        }

        const dbName = process.env.MONGODB_DB || 'renew_assets';
        const db = client.db(dbName);
        const collection = db.collection(COLLECTION_NAME);

        // Check if document exists
        const existing = await collection.findOne({});

        if (existing) {
            // Update existing document
            await collection.updateOne(
                { _id: existing._id },
                { $set: defaults }
            );
        } else {
            // Insert new document
            await collection.insertOne(defaults);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Defaults saved successfully to MongoDB' 
        });
    } catch (error) {
        console.error('Error saving asset defaults to MongoDB:', error);
        return NextResponse.json(
            { error: 'Failed to save asset defaults to MongoDB', details: error.message },
            { status: 500 }
        );
    }
}
