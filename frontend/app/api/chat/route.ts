export const runtime = 'nodejs';

// Use BACKEND_URL for server-side API routes (Vercel deployment)
// Falls back to localhost for local development
function getBackendUrl() {
  // Server-side only variable for production (ngrok/deployed backend)
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // Local development - always use localhost
  return 'http://localhost:8000';
}

export async function POST(request: Request) {
  try {
    const backendBase = getBackendUrl();
    const body = await request.json();
    const res = await fetch(`${backendBase}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
