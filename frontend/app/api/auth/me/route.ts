export const runtime = 'nodejs';

function getBackendUrl() {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'http://localhost:8000';
}

function getTokenFromCookie(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const p of parts) {
    const [k, v] = p.trim().split('=');
    if (k === 'auth_token') return decodeURIComponent(v || '');
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const token = getTokenFromCookie(cookie);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const backendBase = getBackendUrl();
    // Backend /auth/me expects ?token=
    const res = await fetch(`${backendBase}/auth/me?token=${encodeURIComponent(token)}`, { method: 'GET' });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
