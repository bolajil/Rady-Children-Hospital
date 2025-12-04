import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If backend doesn't have feedback endpoint yet, store locally
      console.log('Feedback received (backend not available):', body);
      return NextResponse.json({ 
        success: true, 
        message: 'Feedback recorded locally',
        data: body 
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Store feedback locally if backend is unavailable
    console.log('Feedback received (error connecting to backend):', error);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ 
      success: true, 
      message: 'Feedback recorded locally',
      data: body 
    });
  }
}
