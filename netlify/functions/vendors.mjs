import { getStore } from '@netlify/blobs';
import { createReadStream } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(__dirname, '../../data/vendors.json');
const BLOB_KEY  = 'vendors';

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

export default async function handler(event) {
  const store   = getStore('dr-factures');
  const method  = event.httpMethod;
  // Extract optional :id from path  e.g. /api/vendors/guillevin
  const id      = event.path.split('/api/vendors/')[1]?.split('?')[0] || null;
  const vendors = await getVendors(store);

  if (method === 'GET') {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vendors) };
  }

  if (method === 'POST') {
    const v = JSON.parse(event.body);
    if (vendors.find(x => x.id === v.id)) {
      return { statusCode: 400, body: JSON.stringify({ error: `ID "${v.id}" déjà utilisé` }) };
    }
    vendors.push(v);
    await saveVendors(store, vendors);
    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) };
  }

  if (method === 'PUT' && id) {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx === -1) return { statusCode: 404, body: JSON.stringify({ error: 'Introuvable' }) };
    vendors[idx] = { ...vendors[idx], ...JSON.parse(event.body), id };
    await saveVendors(store, vendors);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vendors[idx]) };
  }

  if (method === 'DELETE' && id) {
    const filtered = vendors.filter(v => v.id !== id);
    if (filtered.length === vendors.length) return { statusCode: 404, body: JSON.stringify({ error: 'Introuvable' }) };
    await saveVendors(store, filtered);
    return { statusCode: 204, body: '' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
