// ─── Date ────────────────────────────────────────────────────────────────────

// Ordered most-specific first so YYYY-MM-DD is preferred over YY-MM-DD
const DATE_PATTERNS = [
  { pattern: /(\d{4})[-/.](\d{2})[-/.](\d{2})/, build: (m) => `${m[1].slice(2)}.${m[2]}.${m[3]}` },
  { pattern: /(\d{2})[-/.](\d{2})[-/.](\d{4})/, build: (m) => `${m[3].slice(2)}.${m[2]}.${m[1]}` },
  { pattern: /(\d{2})[-/.](\d{2})[-/.](\d{2})/, build: (m) => `${m[3]}.${m[2]}.${m[1]}` },
];

/**
 * @param {string} text - Raw PDF text content
 * @returns {string} Date in YY.MM.DD format, or 'YY.MM.DD' if not found
 */
function extractDate(text) {
  for (const { pattern, build } of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return build(match);
  }
  return 'YY.MM.DD';
}

// ─── Vendor ───────────────────────────────────────────────────────────────────
// Delegated to reference.js (data/vendors.json) — add vendors there, not here.

const { matchVendor } = require('./reference');

/**
 * @param {string} filename
 * @param {string} pdfText - Raw PDF text / OCR output
 * @returns {string}
 */
function extractVendor(filename, pdfText) {
  return matchVendor(filename, pdfText);
}

// ─── Invoice number ───────────────────────────────────────────────────────────

// Each extractor returns a string or null/undefined; first non-null result wins
const INVOICE_EXTRACTORS = [
  (f) => f.startsWith('Facture') ? f.match(/Facture(\d+)_/)?.[1] : null,
  (f) => /^Inv\d/i.test(f) ? f.match(/Inv(\d+)\./i)?.[1] : null,
  (f) => /^Fact\d/i.test(f) ? f.match(/Fact(\d+)\./i)?.[1] : null,
  (f) => (f.startsWith('221668209_') || f.startsWith('221668229_')) ? f.split('_')[0] : null,
  (f) => f.startsWith('Attachment_') ? f.match(/Attachment_(\d+)\./i)?.[1] : null,
  (f) => f.match(/(\d{5,})/)?.[1], // generic fallback: first 5+ digit run
];

/**
 * @param {string} filename
 * @returns {string}
 */
function extractInvoiceNumber(filename) {
  for (const extractor of INVOICE_EXTRACTORS) {
    const result = extractor(filename);
    if (result) return result;
  }
  return '00000';
}

module.exports = { extractDate, extractVendor, extractInvoiceNumber };
