export const runtime = 'nodejs';

// Simple health check - just confirms the frontend is running
// Does NOT call backend (backend has its own health check on port 80)
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'healthy', 
      service: 'frontend',
      timestamp: new Date().toISOString()
    }), 
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
