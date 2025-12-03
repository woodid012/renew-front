// app/api/run-model/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Determine backend URL - use local if in development, otherwise use env var
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = isDevelopment 
      ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    
    console.log(`Proxying to backend: ${backendUrl}/api/run-model`);
    
    // Forward the request to the Python backend
    const response = await fetch(`${backendUrl}/api/run-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: data.message || `Backend returned ${response.status}` 
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Failed to connect to backend. Make sure the Python backend is running on port 10000.' 
      },
      { status: 500 }
    );
  }
}






