import { getStore } from '@netlify/blobs';

export default async function handler(event) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const store = getStore('dr-factures');
    const raw   = await store.get('history');
    const data  = raw ? JSON.parse(raw) : { stats: { total: 0, successful: 0, failed: 0 } };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.stats),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ total: 0, successful: 0, failed: 0 }) };
  }
}
