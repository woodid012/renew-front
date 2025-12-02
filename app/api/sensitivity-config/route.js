import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// Define path to config file - adjust relative path as needed
// Assuming frontend is in c:\Projects\renew-front and backend in c:\Projects\backend-renew
const CONFIG_PATH = path.join(process.cwd(), '..', 'backend-renew', 'config', 'sensitivity_config.json');

export async function GET() {
    try {
        const configFile = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(configFile);
        return NextResponse.json(config);
    } catch (error) {
        console.error('Failed to read sensitivity config:', error);
        return NextResponse.json(
            { message: 'Failed to read sensitivity config', error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Basic validation could go here

        // Write to file
        await fs.writeFile(CONFIG_PATH, JSON.stringify(body, null, 4), 'utf8');

        return NextResponse.json({ status: 'success', message: 'Configuration saved' });
    } catch (error) {
        console.error('Failed to save sensitivity config:', error);
        return NextResponse.json(
            { message: 'Failed to save sensitivity config', error: error.message },
            { status: 500 }
        );
    }
}
