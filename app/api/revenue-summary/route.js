import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
    const pythonApiUrl = `${backendUrl}/api/revenue-summary`;

    const response = await fetch(pythonApiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}