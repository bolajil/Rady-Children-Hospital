export const runtime = 'nodejs';

function clearAuthCookie() {
  const isProd = !!process.env.VERCEL;
  const attrs = [
    'auth_token=;',
    'Path=/',
    'Max-Age=0',
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

export async function POST() {
  const headers = new Headers();
  headers.append('Set-Cookie', clearAuthCookie());
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
  });
}
