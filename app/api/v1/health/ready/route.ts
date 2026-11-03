import { checkDatabaseReady } from '@/lib/health';

export function GET() {
  const ready = checkDatabaseReady();
  return new Response(JSON.stringify({ status: ready ? 'ready' : 'unavailable' }), {
    status: ready ? 200 : 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
