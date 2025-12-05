// app/api/asset-defaults/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const COLLECTION_NAME = 'CONFIG_assetDefaults';

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
                    error: 'Asset defaults not found in MongoDB.',
                    needsInitialization: true,
                    hint: 'Click "Initialize Defaults" button below to create default values, or run: python scripts/initialize_asset_defaults_mongo.py'
                },
                { status: 404 }
            );
        }

        // Validate the structure before returning
        if (!defaults.assetDefaults || !defaults.platformDefaults) {
            console.error('Invalid defaults structure in MongoDB:', {
                hasAssetDefaults: !!defaults.assetDefaults,
                hasPlatformDefaults: !!defaults.platformDefaults,
                keys: Object.keys(defaults)
            });
            return NextResponse.json(
                { 
                    error: 'Invalid defaults structure in MongoDB',
                    hint: 'The document exists but is missing required fields (assetDefaults or platformDefaults). Please reinitialize defaults.',
                    needsInitialization: true
                },
                { status: 500 }
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

// Helper function to get default values
function getDefaultDefaults() {
    return {
        assetDefaults: {
            solar: {
                assetLife: 25,
                volumeLossAdjustment: 95,
                annualDegradation: 0.5,
                constructionDuration: 18,
                capacityFactors: {
                    NSW: { q1: 28, q2: 25, q3: 27, q4: 30 },
                    VIC: { q1: 25, q2: 22, q3: 23, q4: 27 },
                    QLD: { q1: 29, q2: 26, q3: 28, q4: 31 },
                    SA: { q1: 27, q2: 24, q3: 26, q4: 29 },
                    WA: { q1: 26, q2: 23, q3: 25, q4: 28 },
                    TAS: { q1: 23, q2: 20, q3: 22, q4: 25 }
                },
                costAssumptions: {
                    capexPerMW: 1.344,
                    opexPerMWPerYear: 0.055,
                    operatingCostEscalation: 2.5,
                    terminalValuePerMW: 0,
                    maxGearing: 0.7,
                    targetDSCRContract: 1.4,
                    targetDSCRMerchant: 1.8,
                    interestRate: 0.06,
                    tenorYears: 20,
                    debtStructure: "sculpting"
                }
            },
            wind: {
                assetLife: 25,
                volumeLossAdjustment: 95,
                annualDegradation: 0.5,
                constructionDuration: 24,
                capacityFactors: {
                    NSW: { q1: 35, q2: 32, q3: 34, q4: 38 },
                    VIC: { q1: 38, q2: 35, q3: 37, q4: 41 },
                    QLD: { q1: 32, q2: 29, q3: 31, q4: 35 },
                    SA: { q1: 40, q2: 37, q3: 39, q4: 43 },
                    WA: { q1: 37, q2: 34, q3: 36, q4: 40 },
                    TAS: { q1: 42, q2: 39, q3: 41, q4: 45 }
                },
                costAssumptions: {
                    capexPerMW: 3.221,
                    opexPerMWPerYear: 0.045,
                    operatingCostEscalation: 2.5,
                    terminalValuePerMW: 0,
                    maxGearing: 0.65,
                    targetDSCRContract: 1.4,
                    targetDSCRMerchant: 1.8,
                    interestRate: 0.06,
                    tenorYears: 20,
                    debtStructure: "sculpting"
                }
            },
            storage: {
                assetLife: 15,
                volumeLossAdjustment: 95,
                annualDegradation: 1.0,
                constructionDuration: 12,
                durationHours: 2,
                roundTripEfficiency: 85,
                costAssumptions: {
                    capexPerMW: 2.0,
                    opexPerMWPerYear: 0.03,
                    operatingCostEscalation: 2.5,
                    terminalValuePerMW: 0.5,
                    maxGearing: 0.6,
                    targetDSCRContract: 1.5,
                    targetDSCRMerchant: 2.0,
                    interestRate: 0.065,
                    tenorYears: 15,
                    debtStructure: "sculpting"
                }
            }
        },
        platformDefaults: {
            taxRate: 0.30,
            fiscalYearStartMonth: 7,
            defaultCurrency: "AUD",
            inflationRate: 2.5,
            merchantPriceEscalationRate: 2.5,
            debtSizingMethod: "dscr",
            dscrCalculationFrequency: "quarterly",
            debtRepaymentFrequency: "quarterly",
            debtGracePeriodMonths: 0,
            enableTerminalValue: true
        },
        metadata: {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            description: "Default configuration values for renewable energy asset modeling",
            initializedFrom: "frontend-api"
        }
    };
}

export async function PUT() {
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

        // Check if document already exists
        const existing = await collection.findOne({});
        
        if (existing) {
            return NextResponse.json(
                { 
                    error: 'Asset defaults already exist in MongoDB',
                    hint: 'Use POST to update existing defaults'
                },
                { status: 409 }
            );
        }

        // Get default values and insert
        const defaultDefaults = getDefaultDefaults();
        const result = await collection.insertOne(defaultDefaults);

        return NextResponse.json({ 
            success: true, 
            message: 'Default asset defaults initialized successfully',
            insertedId: result.insertedId
        });
    } catch (error) {
        console.error('Error initializing asset defaults:', error);
        return NextResponse.json(
            { error: 'Failed to initialize asset defaults', details: error.message },
            { status: 500 }
        );
    }
}
