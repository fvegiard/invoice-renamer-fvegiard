import { getStore } from '@netlify/blobs';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  try {
    const store = getStore('dr-factures');
    const raw   = await store.get('history');
    const data  = raw ? JSON.parse(raw) : { stats: { total: 0, successful: 0, failed: 0 } };
    return jsonResponse(data.stats);
  } catch {
    return jsonResponse({ total: 0, successful: 0, failed: 0 });
  }
}
