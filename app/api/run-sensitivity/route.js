// app/api/run-sensitivity/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Determine backend URL - use local if in development, otherwise use env var
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = isDevelopment 
      ? process.env.LOCAL_BACKEND_URL || 'http://localhost:10000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    
    console.log(`Proxying to backend: ${backendUrl}/api/sensitivity`);
    
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
    
    // Forward the request to the Python backend
    const response = await fetch(`${backendUrl}/api/sensitivity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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


