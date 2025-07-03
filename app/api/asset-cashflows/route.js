import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('asset_id');

  try {
    // Construct the URL for the Python backend API
    // Make sure this URL is correct for your backend deployment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
    const pythonApiUrl = `${backendUrl}/api/asset-cashflows${assetId ? `?asset_id=${assetId}` : ''}`;

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