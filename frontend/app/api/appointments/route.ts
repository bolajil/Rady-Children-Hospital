export const runtime = 'nodejs';

// Use BACKEND_URL for server-side API routes (Vercel deployment)
// Falls back to localhost for local development
function getBackendUrl() {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  return 'http://localhost:8000';
}

function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, v] = p.trim().split('=');
    if (k === 'auth_token') return decodeURIComponent(v || '');
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const backendBase = getBackendUrl();
    const url = new URL(request.url);
    const queryString = url.search;
    // Forward auth token from HttpOnly cookie if present
    const token = getTokenFromCookieHeader(request.headers.get('cookie'));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token)}`;
    
    const res = await fetch(`${backendBase}/appointments/${queryString}`, {
      method: 'GET',
      headers,
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const backendBase = getBackendUrl();
    const body = await request.json();
    const token = getTokenFromCookieHeader(request.headers.get('cookie'));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token)}`;
    
    const res = await fetch(`${backendBase}/appointments/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
