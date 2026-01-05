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
      // Try to extract error message from backend response
      let errorMessage = `Backend returned ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // If not JSON, use the text as error message
            errorMessage = errorText.substring(0, 500); // Limit length
          }
        }
      } catch (e) {
        console.error('Failed to read error response:', e);
      }
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: errorMessage 
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
    const errorMessage = error.message || 'Failed to connect to backend. Make sure the Python backend is running on port 10000.';
    const backendUrl = process.env.NODE_ENV === 'development'
      ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: `${errorMessage} (Backend URL: ${backendUrl})`,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}














