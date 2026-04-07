export const runtime = 'nodejs';

function getBackendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
}

// Forward multipart form data to backend scan-analysis endpoint
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const backendBase = getBackendUrl();

    const upstream = await fetch(`${backendBase}/scan-analysis`, {
      method: 'POST',
      body: formData,
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
