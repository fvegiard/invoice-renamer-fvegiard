const fs = require('fs');
const path = require('path');

const CORPUS_ROOT = 'D:\\antigravity 3\\facture\\conformes';

const CORPUS_SAMPLES = {
  Guillevin: path.join(CORPUS_ROOT, 'Guillevin', '4 - Factures', '2026', '18999 - Regulier'),
  Wesco: path.join(CORPUS_ROOT, 'Wesco', '4 - Factures', '2026'),
  'United Rentals': path.join(CORPUS_ROOT, 'United Rental', '4 - Factures', '2026'),
  'Securite Sirois': path.join(CORPUS_ROOT, 'Sécurité Sirois', '4 - Factures', '2026'),
};

const CORPUS_INVENTORY = buildCorpusInventory();

const VENDOR_RULES = {
  Guillevin: {
    requiredFields: ['date', 'customerCode', 'invoiceNumber'],
    build(metadata) {
      const parts = [metadata.date, 'DR', metadata.customerCode, metadata.invoiceNumber];
      if (metadata.customerReference) parts.push(metadata.customerReference);
      parts.push('Guillevin');
      if (metadata.documentType === 'credit') parts.push('Credit');
      return `${parts.join(' - ')}.pdf`;
    },
  },
  Wesco: {
    requiredFields: ['date', 'customerCode', 'invoiceNumber'],
    build(metadata) {
      const parts = [metadata.date, 'DR', metadata.customerCode, metadata.invoiceNumber];
      if (metadata.customerReference) parts.push(metadata.customerReference);
      parts.push('Wesco');
      if (metadata.documentType === 'credit') parts.push('Credit');
      return `${parts.join(' - ')}.pdf`;
    },
  },
  'United Rentals': {
    requiredFields: ['date', 'invoiceNumber'],
    build(metadata) {
      const parts = [metadata.date, 'DR', metadata.invoiceNumber];
      if (metadata.customerReference) parts.push(metadata.customerReference);
      parts.push('United Rentals');
      if (metadata.documentType === 'credit') parts.push('Credit');
      return `${parts.join(' - ')}.pdf`;
    },
  },
  'Securite Sirois': {
    requiredFields: ['date', 'invoiceNumber'],
    build(metadata) {
      return `${metadata.date} - DR - ${metadata.invoiceNumber} - Securite Sirois.pdf`;
    },
  },
};

function listCorpusFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((entry) => entry.toLowerCase().endsWith('.pdf'))
    .sort();
}

function tokenizeFilename(filename) {
  return filename.replace(/\.pdf$/i, '').split(' - ');
}

function classifyVendorPattern(filename) {
  const tokens = tokenizeFilename(filename);
  const lastToken = tokens[tokens.length - 1];
  const secondLast = tokens[tokens.length - 2];

  if (lastToken === 'Credit') {
    return {
      pattern: 'credit',
      vendor: secondLast,
      tokenCount: tokens.length,
    };
  }

  return {
    pattern: 'invoice',
    vendor: lastToken,
    tokenCount: tokens.length,
  };
}

function buildCorpusInventory() {
  const inventory = {};

  for (const [vendor, dir] of Object.entries(CORPUS_SAMPLES)) {
    const files = listCorpusFiles(dir);
    inventory[vendor] = {
      directory: dir,
      files,
      patterns: files.map(classifyVendorPattern),
    };
  }

  return inventory;
}

function inferDocumentType(text) {
  const upperText = String(text || '').toUpperCase();
  if (upperText.includes('CREDIT') || upperText.includes('CRÉDIT') || upperText.includes('NOTE DE CRÉDIT')) {
    return 'credit';
  }
  return 'invoice';
}

function cleanCapturedValue(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-');
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return cleanCapturedValue(match[1]);
  }
  return '';
}

function extractVendorSpecificFields(vendor, text) {
  switch (vendor) {
    case 'Guillevin':
      return {
        customerCode: firstMatch(text, [
          /Client:\s*([A-Z0-9-]+)/i,
          /ID\s*Exp\.\s*à:\s*([A-Z0-9-]+)/i,
        ]),
        customerReference: firstMatch(text, [
          /(?:^|\n)\s*([A-Z0-9-]{4,})\s+NET\s+EOMF/i,
          /Numéro de BC client[^\n]*\n\s*([A-Z0-9-]{4,})/i,
        ]),
      };
    case 'Wesco':
      return {
        customerCode: firstMatch(text, [
          /CUSTOMER NO\.?\s*([0-9]{5})-\d{2}/i,
          /N° DU CLIENT\s*([0-9]{5})-\d{2}/i,
        ]),
        customerReference: firstMatch(text, [
          /CUSTOMER ORDER NUMBER\s*([A-Z0-9-]{4,})/i,
          /N° DE COMMANDE DU CLIENT\s*([A-Z0-9-]{4,})/i,
        ]),
      };
    case 'United Rentals':
      return {
        customerReference: firstMatch(text, [
          /P\.O\.\s*#\s*:\s*([A-Z0-9-]+)/i,
          /(?:^|\n)\s*([A-Z0-9-]{4,})\s*\n(?:-- 1 of 1 --|\s*$)/i,
        ]),
      };
    default:
      return {};
  }
}

function extractVendorDate(vendor, text, fallbackDate) {
  switch (vendor) {
    case 'Wesco':
      return firstMatch(text, [
        /INVOICE DATE[\s\S]{0,40}?(\d{2}\/\d{2}\/\d{4})/i,
        /DATE DE FACTURE[\s\S]{0,40}?(\d{2}\/\d{2}\/\d{4})/i,
      ])
        .replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, (_, mm, dd, yyyy) => `${yyyy.slice(2)}.${mm}.${dd}`) || fallbackDate;
    case 'United Rentals':
      return firstMatch(text, [
        /Date De Facture:\s*(\d{2}\/\d{2}\/\d{2})/i,
      ])
        .replace(/^(\d{2})\/(\d{2})\/(\d{2})$/, (_, dd, mm, yy) => `${yy}.${mm}.${dd}`) || fallbackDate;
    case 'Securite Sirois':
      return firstMatch(text, [
        /(\d{4}-\d{2}-\d{2})/i,
      ])
        .replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, yyyy, mm, dd) => `${yyyy.slice(2)}.${mm}.${dd}`) || fallbackDate;
    default:
      return fallbackDate;
  }
}

function extractVendorInvoiceNumber(vendor, text, fallbackInvoiceNumber) {
  switch (vendor) {
    case 'United Rentals':
      return firstMatch(text, [
        /#\s*([0-9-]{6,})/i,
      ]) || fallbackInvoiceNumber;
    case 'Securite Sirois':
      return firstMatch(text, [
        /FACTURE\s*([A-Z0-9-]{6,})/i,
      ]) || fallbackInvoiceNumber;
    default:
      return fallbackInvoiceNumber;
  }
}

function buildFilename(metadata) {
  const rule = VENDOR_RULES[metadata.vendor];
  if (!rule) {
    // Fallback for vendors not yet explicitly mapped: keep 2026 DR shape and avoid hard failures.
    const genericParts = [metadata.date, 'DR', metadata.invoiceNumber];
    if (metadata.customerReference) genericParts.push(metadata.customerReference);
    genericParts.push(metadata.vendor);
    if (metadata.documentType === 'credit') genericParts.push('Credit');
    return `${genericParts.join(' - ')}.pdf`;
  }

  const missing = rule.requiredFields.filter((field) => !metadata[field]);
  if (missing.length > 0) {
    throw new Error(`Missing 2026 naming fields for ${metadata.vendor}: ${missing.join(', ')}`);
  }

  return rule.build(metadata);
}

function build2026Filename({
  vendor,
  date,
  invoiceNumber,
  customerCode = '',
  customerReference = '',
  documentType = '',
  sourceText = '',
}) {
  const metadata = {
    vendor,
    date: extractVendorDate(vendor, sourceText, date),
    invoiceNumber: extractVendorInvoiceNumber(vendor, sourceText, invoiceNumber),
    documentType: documentType || inferDocumentType(sourceText),
    ...extractVendorSpecificFields(vendor, sourceText),
  };

  if (customerCode) metadata.customerCode = customerCode;
  if (customerReference) metadata.customerReference = customerReference;

  return {
    ...metadata,
    renamed: buildFilename(metadata),
  };
}

module.exports = {
  CORPUS_INVENTORY,
  build2026Filename,
  inferDocumentType,
  extractVendorSpecificFields,
};
