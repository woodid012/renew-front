// app/api/asset-defaults/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '..', 'backend-renew', 'config', 'asset_defaults.json');

export async function GET() {
    try {
        const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
        const defaults = JSON.parse(fileContent);
        return NextResponse.json(defaults);
    } catch (error) {
        console.error('Error reading asset defaults:', error);
        return NextResponse.json(
            { error: 'Failed to read asset defaults' },
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
            lastUpdated: new Date().toISOString().split('T')[0],
            version: defaults.metadata?.version || '1.0.0'
        };

        // Write to file
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf8');

        return NextResponse.json({ success: true, message: 'Defaults saved successfully' });
    } catch (error) {
        console.error('Error saving asset defaults:', error);
        return NextResponse.json(
            { error: 'Failed to save asset defaults' },
            { status: 500 }
        );
    }
}
