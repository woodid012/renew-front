
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();

        // Determine backend URL
        const isDevelopment = process.env.NODE_ENV === 'development';
        const backendUrl = isDevelopment
            ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
            : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';

        console.log(`Proxying upload request to: ${backendUrl}/api/price-curves/upload`);

        const response = await fetch(`${backendUrl}/api/price-curves/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { status: 'error', message: data.message || 'Backend error' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error proxying upload request:', error);
        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        );
    }
}
