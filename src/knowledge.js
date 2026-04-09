const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KNOWLEDGE_FILE = path.join(__dirname, '../data/knowledge.json');

function load() {
  if (!fs.existsSync(KNOWLEDGE_FILE)) {
    return { processed: [], stats: { total: 0, successful: 0, failed: 0 } };
  }
  return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(data, null, 2));
}

/**
 * Record a processed invoice in the knowledge base.
 * @param {{ original: string, renamed: string|null, date: string, vendor: string, invoiceNumber: string, status: 'ok'|'error', message?: string }} entry
 */
function record(entry) {
  const data = load();

  data.processed.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });

  // Keep last 1000 entries to avoid unbounded growth
  if (data.processed.length > 1000) {
    data.processed = data.processed.slice(0, 1000);
  }

  data.stats.total++;
  if (entry.status === 'ok') data.stats.successful++;
  else data.stats.failed++;

  save(data);
}

/** Return the N most recent processed invoices. */
function getHistory(limit = 100) {
  return load().processed.slice(0, limit);
}

/** Return aggregate stats. */
function getStats() {
  return load().stats;
}

module.exports = { record, getHistory, getStats };
