const fs = require('fs');
const path = require('path');

const CONFORMES_DIR = 'D:\\antigravity 3\\facture\\conformes';
const OUTPUT_FILE   = path.join(__dirname, '..', 'data', 'vendors.json');

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveTextPatterns(name) {
  // Remove account numbers like "Bell - 292044816" -> keep main name
  const cleaned = name
    .replace(/\s*-\s*\d[\d\s-]+$/, '')  // trailing number after dash
    .replace(/\s*\(\d+\)$/, '')           // trailing number in parens
    .trim();

  const words = cleaned
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const patterns = [];

  // Full cleaned name (normalized, uppercase)
  const fullPattern = cleaned
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (fullPattern) patterns.push(fullPattern);

  // If name has significant words (acronyms, short names)
  if (words.length === 1 && words[0].length <= 5) {
    // short name like "ACQ", "CCQ" — already included above
  }

  return [...new Set(patterns)];
}

function deriveFilenamePatterns(name) {
  // For "Bell - 292044816" style — include account number as filename pattern
  const accountMatch = name.match(/[-\s]+(\d{5,})\s*$/);
  if (accountMatch) return [accountMatch[1]];
  return [];
}

const folderNames = fs.readdirSync(CONFORMES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Load existing vendors to keep their patterns
let existingVendors = [];
try {
  existingVendors = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
} catch {}

const existingById = Object.fromEntries(existingVendors.map(v => [v.id, v]));
const existingByName = Object.fromEntries(existingVendors.map(v => [v.name.toLowerCase(), v]));

const vendors = folderNames.map(folderName => {
  const id = slugify(folderName);
  const existing = existingById[id] || existingByName[folderName.toLowerCase()];

  if (existing) {
    // Keep existing patterns, just update name from folder
    return { ...existing, id, name: folderName };
  }

  return {
    id,
    name: folderName,
    textPatterns: deriveTextPatterns(folderName),
    filenamePatterns: deriveFilenamePatterns(folderName)
  };
});

// Preserve vendors from existing list that aren't in the folder (manually added)
const folderIds = new Set(vendors.map(v => v.id));
const orphans = existingVendors.filter(v => !folderIds.has(v.id));
if (orphans.length > 0) {
  console.log('Fournisseurs conservés (hors dossier):', orphans.map(v => v.name).join(', '));
  vendors.push(...orphans);
}

// Sort alphabetically
vendors.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vendors, null, 2), 'utf8');
console.log(`✓ ${vendors.length} fournisseurs exportés vers ${OUTPUT_FILE}`);
vendors.slice(0, 5).forEach(v => console.log('  -', v.name, '|', v.textPatterns[0] || '(sans pattern)'));
console.log('  ...');
