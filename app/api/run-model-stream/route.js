// app/api/run-model-stream/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Determine backend URL - use local if in development, otherwise use env var
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = isDevelopment 
      ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    
    console.log(`Proxying stream to backend: ${backendUrl}/api/run-model-stream`);
    
    // Forward the request to the Python backend and stream the response
    const response = await fetch(`${backendUrl}/api/run-model-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `Backend returned ${response.status}` 
        },
        { status: response.status }
      );
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error proxying stream to backend:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Failed to connect to backend. Make sure the Python backend is running on port 10000.' 
      },
      { status: 500 }
    );
  }
}










