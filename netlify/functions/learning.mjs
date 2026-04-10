import { getStore } from '@netlify/blobs';

const BLOB_KEY = 'learning_examples';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getExamples(store) {
  try {
    const raw = await store.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export default async function handler(request) {
  const store = getStore('dr-factures');
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET') {
    const examples = await getExamples(store);
    return jsonResponse(examples);
  }

  if (method === 'POST') {
    const { id, original, renamed } = await request.json();
    let examples = await getExamples(store);

    const idx = examples.findIndex(ex => ex.id === id);
    if (idx !== -1) {
      examples[idx] = { id, original, renamed, timestamp: new Date().toISOString() };
    } else {
      examples.push({ id, original, renamed, timestamp: new Date().toISOString() });
    }

    if (examples.length > 20) examples = examples.slice(-20); // Keep last 20 examples

    await store.set(BLOB_KEY, JSON.stringify(examples, null, 2));
    return new Response(null, { status: 201 });
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing ID', { status: 400 });

    let examples = await getExamples(store);
    const filtered = examples.filter(ex => ex.id !== id);
    
    await store.set(BLOB_KEY, JSON.stringify(filtered, null, 2));
    return new Response(null, { status: 204 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
