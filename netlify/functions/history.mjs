import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';

const BLOB_KEY = 'history';

async function getHistory(store) {
  try {
    const raw = await store.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { processed: [], stats: { total: 0, successful: 0, failed: 0 } };
}

export default async function handler(event) {
  const store  = getStore('dr-factures');
  const method = event.httpMethod;

  if (method === 'GET') {
    const data = await getHistory(store);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.processed.slice(0, 100)),
    };
  }

  if (method === 'POST') {
    const entry = JSON.parse(event.body);
    const data  = await getHistory(store);

    data.processed.unshift({ id: randomUUID(), timestamp: new Date().toISOString(), ...entry });
    if (data.processed.length > 1000) data.processed = data.processed.slice(0, 1000);
    data.stats.total++;
    if (entry.status === 'ok') data.stats.successful++;
    else data.stats.failed++;

    await store.set(BLOB_KEY, JSON.stringify(data, null, 2));
    return { statusCode: 201, body: '' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
