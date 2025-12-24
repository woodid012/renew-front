// app/api/run-sensitivity-stream/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Determine backend URL - use local if in development, otherwise use env var
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = isDevelopment 
      ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    
    console.log(`Proxying sensitivity stream to backend: ${backendUrl}/api/sensitivity-stream`);
    
    // Prepare request body - if config is provided, use it; otherwise use config_file
    const requestBody = {};
    if (body.config) {
      // Config object provided - pass it directly
      requestBody.config = body.config;
      requestBody.prefix = body.prefix || 'sensitivity_results';
    } else if (body.config_file) {
      // Config file path provided
      requestBody.config_file = body.config_file;
      requestBody.prefix = body.prefix || 'sensitivity_results';
    } else {
      // Default to config file
      requestBody.config_file = 'config/sensitivity_config.json';
      requestBody.prefix = body.prefix || 'sensitivity_results';
    }
    
    if (body.portfolio) {
      requestBody.portfolio = body.portfolio;
    }
    
    // Forward the request to the Python backend and stream the response
    const response = await fetch(`${backendUrl}/api/sensitivity-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    console.error('Error proxying sensitivity stream to backend:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Failed to connect to backend. Make sure the Python backend is running on port 10000.' 
      },
      { status: 500 }
    );
  }
}













