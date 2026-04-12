export const runtime = 'nodejs';

function getTokenFromCookie(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const p of parts) {
    const [k, v] = p.trim().split('=');
    if (k === 'auth_token') return decodeURIComponent(v || '');
  }
  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const token = getTokenFromCookie(cookie);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Decode JWT payload locally (signature already validated at login)
    const payload = decodeJwtPayload(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Check expiry
    const exp = payload.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    const user = {
      id: payload.sub,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
      patient_id: payload.patient_id,
    };
    
    return new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Auth error', detail: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
