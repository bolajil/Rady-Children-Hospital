export const runtime = 'nodejs';

function getBackendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const backendBase = getBackendUrl();

    const upstream = await fetch(`${backendBase}/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await upstream.json().catch(() => null);
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ detail: String(err?.message || err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
