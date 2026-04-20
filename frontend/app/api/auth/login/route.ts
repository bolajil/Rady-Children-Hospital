export const runtime = 'nodejs';

import http from 'http';

function getBackendPort() {
  return 8003;
}

function setAuthCookie(token: string) {
  const isProd = !!process.env.VERCEL;
  const attrs = [
    `auth_token=${encodeURIComponent(token)}`,
    'Path=/',
    'Max-Age=28800',
    'HttpOnly',
  ];
  if (isProd) {
    attrs.push('Secure');
    attrs.push('SameSite=None');
  } else {
    attrs.push('SameSite=Lax');
  }
  return attrs.join('; ');
}

function makeRequest(body: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const port = getBackendPort();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 500, data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const { status, data } = await makeRequest(body);

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    if (status >= 200 && status < 300) {
      try {
        const json = JSON.parse(data);
        const token = json?.access_token as string | undefined;
        if (token) {
          headers.append('Set-Cookie', setAuthCookie(token));
        }
      } catch {
        // ignore parse errors
      }
    }

    return new Response(data, { status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
