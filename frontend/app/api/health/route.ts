export const runtime = 'nodejs';

function getBackendUrl() {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'http://localhost:8000';
}

export async function GET() {
  try {
    const res = await fetch(`${getBackendUrl()}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
