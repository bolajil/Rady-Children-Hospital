export const runtime = 'nodejs';

function getBackendUrl() {
  // In Vercel, BACKEND_URL should be set; locally default to localhost
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'http://localhost:8000';
}

export async function POST(request: Request) {
  try {
    const backendBase = getBackendUrl();
    const body = await request.text(); // keep as text to avoid re-encoding issues

    const upstream = await fetch(`${backendBase}/chat/stream`, {
      method: 'POST',
      // Pass through as JSON
      headers: { 'Content-Type': 'application/json' },
      // Use the same body
      body,
    });

    // Stream the upstream response back to the client using Web Streams API
    const readable = upstream.body;
    if (!readable) {
      const text = await upstream.text();
      return new Response(text || '', {
        status: upstream.status,
        headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'text/plain' },
      });
    }

    // Propagate status and minimal headers; do not buffer
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/plain');

    return new Response(readable, {
      status: upstream.status,
      headers,
    });
  } catch (err: any) {
    return new Response(`[error] ${String(err?.message || err)}\n`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
