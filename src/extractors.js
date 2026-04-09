// ─── Date ────────────────────────────────────────────────────────────────────

const FR_MONTHS = { janvier:1,février:2,fevrier:2,mars:3,avril:4,mai:5,juin:6,
                    juillet:7,août:8,aout:8,septembre:9,octobre:10,novembre:11,décembre:12,decembre:12 };
const EN_MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
                    july:7,august:8,september:9,october:10,november:11,december:12 };

function pad2(n) { return String(n).padStart(2, '0'); }

// Ordered most-specific first so YYYY-MM-DD is preferred over YY-MM-DD
const DATE_PATTERNS = [
  { pattern: /(\d{4})[-/.](\d{2})[-/.](\d{2})/, build: (m) => `${m[1].slice(2)}.${m[2]}.${m[3]}` },
  { pattern: /(\d{2})[-/.](\d{2})[-/.](\d{4})/, build: (m) => `${m[3].slice(2)}.${m[2]}.${m[1]}` },
  { pattern: /(\d{2})[-/.](\d{2})[-/.](\d{2})/, build: (m) => `${m[3]}.${m[2]}.${m[1]}` },
  // English: "January 7, 2026"  or  "Jan 7, 2026"
  {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    build: (m) => `${m[3].slice(2)}.${pad2(EN_MONTHS[m[1].toLowerCase()])}.${pad2(Number(m[2]))}`
  },
  // French: "28 fevrier 2026"  or  "1er janvier 2026"
  {
    pattern: /\b(\d{1,2})(?:er|e)?\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/i,
    build: (m) => `${m[3].slice(2)}.${pad2(FR_MONTHS[m[2].toLowerCase()])}.${pad2(Number(m[1]))}`
  },
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
  // "Facture #15303 - 28-02-2026.pdf"
  (f) => f.match(/^Facture #(\d+)/i)?.[1],
  // "Inv8892642.pdf"  or  "I7501959.pdf"
  (f) => /^Inv\d/i.test(f) ? f.match(/Inv(\d+)\./i)?.[1] : null,
  (f) => /^I[0-9]/.test(f) ? f.match(/^I([0-9]+)\./)?.[1] : null,
  // Credit notes: "CN1975770.pdf"
  (f) => /^CN[0-9]/.test(f) ? f.match(/^CN([0-9]+)/)?.[1] : null,
  // "Fact 9667.pdf"  or  "fact 823.pdf"
  (f) => /^Fact\s+\d/i.test(f) ? f.match(/^Fact\s+(\d+)/i)?.[1] : null,
  // "BE-1313.pdf" (Groupe BR)
  (f) => /^BE-\d/i.test(f) ? f.match(/^BE-(\d+)/i)?.[1] : null,
  // "IN001128.pdf" (Stanex)
  (f) => /^IN\d/i.test(f) ? f.match(/^IN(\d+)/i)?.[1] : null,
  // "FACTURE_90018108.pdf"
  (f) => /^FACTURE_\d/i.test(f) ? f.match(/^FACTURE_(\d+)/i)?.[1] : null,
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
