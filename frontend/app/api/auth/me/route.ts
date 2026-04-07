export const runtime = 'nodejs';

import http from 'http';

function getBackendPort() {
  return 8000;
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

function makeRequest(token: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const port = getBackendPort();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: `/auth/me?token=${encodeURIComponent(token)}`,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 500, data }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const token = getTokenFromCookie(cookie);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const { status, data } = await makeRequest(token);
    return new Response(data, { status, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
