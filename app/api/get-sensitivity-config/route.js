import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
    try {
        // Resolve path correctly - go up one directory from frontend, then into backend-renew/config
        const configPath = path.join(process.cwd(), '..', 'backend-renew', 'config', 'sensitivity_config.json');
        const configFile = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configFile);
        return NextResponse.json(config);
    } catch (error) {
        console.error('Failed to read sensitivity config:', error);
        console.error('Attempted path:', path.join(process.cwd(), '..', 'backend-renew', 'config', 'sensitivity_config.json'));
        return NextResponse.json({ message: 'Failed to read sensitivity config', error: error.message }, { status: 500 });
    }
}
