export const runtime = 'nodejs';

function getBackendUrl() {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'http://localhost:8000';
}

function setAuthCookie(token: string) {
  // In Vercel/HTTPS, set Secure and SameSite=None for cross-site cookies
  const isProd = !!process.env.VERCEL;
  const attrs = [
    `auth_token=${encodeURIComponent(token)}`,
    'Path=/',
    // 8 hours to match backend token exp
    'Max-Age=28800',
    'HttpOnly',
  ];
  if (isProd) {
    attrs.push('Secure');
    attrs.push('SameSite=None');
  } else {
    // For localhost dev, SameSite=Lax avoids some third-party issues without Secure
    attrs.push('SameSite=Lax');
  }
  return attrs.join('; ');
}

export async function POST(request: Request) {
  try {
    const backendBase = getBackendUrl();
    const body = await request.text();

    const res = await fetch(`${backendBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await res.text();
    // Pass through body and status
    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');

    // If successful, set auth cookie
    if (res.ok) {
      try {
        const json = JSON.parse(text);
        const token = json?.access_token as string | undefined;
        if (token) {
          headers.append('Set-Cookie', setAuthCookie(token));
        }
      } catch {
        // ignore parse errors; return body as-is
      }
    }

    return new Response(text, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
