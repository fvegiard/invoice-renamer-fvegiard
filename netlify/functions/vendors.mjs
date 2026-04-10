import { getStore } from '@netlify/blobs';
import { readFileSync } from 'fs';
import { URL } from 'url';

const SEED_FILE = new URL('../../data/vendors.json', import.meta.url);
const BLOB_KEY  = 'vendors';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getVendors(store) {
  try {
    const raw = await store.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First deploy: seed from bundled vendors.json
  return JSON.parse(readFileSync(SEED_FILE, 'utf8'));
}

async function saveVendors(store, vendors) {
  await store.set(BLOB_KEY, JSON.stringify(vendors, null, 2));
}

export default async function handler(request) {
  const store   = getStore('dr-factures');
  const method  = request.method;
  const url = new URL(request.url);
  const id = url.pathname.split('/api/vendors/')[1]?.split('/')[0] || null;
  const vendors = await getVendors(store);

  if (method === 'GET') {
    return jsonResponse(vendors);
  }

  if (method === 'POST') {
    const v = await request.json();
    if (vendors.find(x => x.id === v.id)) {
      return jsonResponse({ error: `ID "${v.id}" déjà utilisé` }, 400);
    }
    vendors.push(v);
    await saveVendors(store, vendors);
    return jsonResponse(v, 201);
  }

  if (method === 'PUT' && id) {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx === -1) return jsonResponse({ error: 'Introuvable' }, 404);
    vendors[idx] = { ...vendors[idx], ...await request.json(), id };
    await saveVendors(store, vendors);
    return jsonResponse(vendors[idx]);
  }

  if (method === 'DELETE' && id) {
    const filtered = vendors.filter(v => v.id !== id);
    if (filtered.length === vendors.length) return jsonResponse({ error: 'Introuvable' }, 404);
    await saveVendors(store, filtered);
    return new Response(null, { status: 204 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
