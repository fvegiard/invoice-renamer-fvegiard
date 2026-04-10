import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';

const BLOB_KEY = 'history';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getHistory(store) {
  try {
    const raw = await store.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { processed: [], stats: { total: 0, successful: 0, failed: 0 } };
}

export default async function handler(request) {
  const store  = getStore('dr-factures');
  const method = request.method;

  if (method === 'GET') {
    const data = await getHistory(store);
    return jsonResponse(data.processed.slice(0, 100));
  }

  if (method === 'POST') {
    const entry = await request.json();
    const data  = await getHistory(store);

    data.processed.unshift({ id: randomUUID(), timestamp: new Date().toISOString(), ...entry });
    if (data.processed.length > 1000) data.processed = data.processed.slice(0, 1000);
    data.stats.total++;
    if (entry.status === 'ok') data.stats.successful++;
    else data.stats.failed++;

    await store.set(BLOB_KEY, JSON.stringify(data, null, 2));
    return new Response(null, { status: 201 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
