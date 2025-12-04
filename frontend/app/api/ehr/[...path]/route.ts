export const runtime = 'nodejs';

// Use BACKEND_URL for server-side API routes (Vercel deployment)
// Falls back to localhost for local development
function getBackendUrl() {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'http://localhost:8000';
}

function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, v] = p.trim().split('=');
    if (k === 'auth_token') return v || '';
  }
  return null;
}

function buildUpstreamUrl(request: Request, pathSegments: string[]) {
  const backendBase = getBackendUrl();
  const url = new URL(request.url);
  const query = url.search; // includes leading '?', or ''
  const joinedPath = pathSegments?.length ? pathSegments.join('/') : '';
  // Ensure no double slashes
  const target = `${backendBase}/ehr/${joinedPath}${query}`.replace(/([^:])\/\/+/, '$1/');
  return target;
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path } = await context.params;
    const upstream = buildUpstreamUrl(request, path || []);
    // Forward Authorization from auth_token cookie if present
    const token = getTokenFromCookieHeader(request.headers.get('cookie'));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token)}`;
    const res = await fetch(upstream, { method: 'GET', headers });
    const bodyText = await res.text();
    return new Response(bodyText, {
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
