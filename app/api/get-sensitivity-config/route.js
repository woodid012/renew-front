import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
    try {
        const configPath = path.join(process.cwd(), '..\backend-renew\config', 'sensitivity_config.json');
        const configFile = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configFile);
        return NextResponse.json(config);
    } catch (error) {
        console.error('Failed to read sensitivity config:', error);
        return NextResponse.json({ message: 'Failed to read sensitivity config', error: error.message }, { status: 500 });
    }
}
