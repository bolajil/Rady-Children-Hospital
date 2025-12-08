import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const pathStr = path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(
            `${BACKEND_URL}/compliance/${pathStr}${queryString}`,
            {
                method: 'GET',
                headers,
            }
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Compliance API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch compliance data' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const pathStr = path.join('/');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const body = await request.json().catch(() => ({}));
        
        const response = await fetch(
            `${BACKEND_URL}/compliance/${pathStr}`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            }
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Compliance API error:', error);
        return NextResponse.json(
            { error: 'Failed to post compliance data' },
            { status: 500 }
        );
    }
}
