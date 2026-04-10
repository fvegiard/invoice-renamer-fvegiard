const fs = require('fs');
const path = require('path');

const VENDORS_FILE = path.join(__dirname, '../data/vendors.json');

function load() {
  return JSON.parse(fs.readFileSync(VENDORS_FILE, 'utf8'));
}

function save(vendors) {
  fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2));
}

/**
 * Match a vendor from filename + OCR text against the reference catalog.
 * First match wins (catalog order = priority).
 * @param {string} filename
 * @param {string} text - OCR text
 * @returns {string} Vendor name or 'FournisseurInconnu'
 */
function matchVendor(filename, text) {
  const upperText = text.toUpperCase();
  const vendors = load();

  // Filename patterns are more specific — check them first across all vendors
  for (const vendor of vendors) {
    if (vendor.filenamePatterns.some((p) => new RegExp(p, 'i').test(filename))) {
      return vendor.name;
    }
  }

  // Fallback: text patterns
  for (const vendor of vendors) {
    if (vendor.textPatterns.some((p) => upperText.includes(p.toUpperCase()))) {
      return vendor.name;
    }
  }

  return 'FournisseurInconnu';
}

/**
 * Normalize any detected vendor label to the canonical reference name.
 * Falls back to catalog pattern matching, then to the provided value.
 * @param {string} vendorName
 * @param {string} filename
 * @param {string} text
 * @returns {string}
 */
function canonicalizeVendor(vendorName, filename = '', text = '') {
  const sourceName = String(vendorName || '').trim();
  const upperName = sourceName.toUpperCase();

  for (const vendor of load()) {
    if (vendor.name.toUpperCase() === upperName) return vendor.name;

    const matchesTextPattern = vendor.textPatterns.some((p) => upperName.includes(p.toUpperCase()));
    const matchesFilenamePattern = vendor.filenamePatterns.some((p) => {
      try {
        return new RegExp(p, 'i').test(sourceName);
      } catch {
        return false;
      }
    });

    if (matchesTextPattern || matchesFilenamePattern) return vendor.name;
  }

  if (filename || text) {
    return matchVendor(filename, text);
  }

  return sourceName || 'FournisseurInconnu';
}

/** Return the full vendor list */
function listVendors() {
  return load();
}

/** Add a new vendor. Rejects duplicates by id. */
function addVendor(vendor) {
  const vendors = load();
  if (vendors.find((v) => v.id === vendor.id)) {
    throw new Error(`Vendor id "${vendor.id}" already exists`);
  }
  vendors.push(vendor);
  save(vendors);
  return vendor;
}

/** Update an existing vendor by id. */
function updateVendor(id, patch) {
  const vendors = load();
  const idx = vendors.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error(`Vendor "${id}" not found`);
  vendors[idx] = { ...vendors[idx], ...patch, id };
  save(vendors);
  return vendors[idx];
}

/** Remove a vendor by id. */
function removeVendor(id) {
  const vendors = load();
  const filtered = vendors.filter((v) => v.id !== id);
  if (filtered.length === vendors.length) throw new Error(`Vendor "${id}" not found`);
  save(filtered);
}

module.exports = {
  matchVendor,
  canonicalizeVendor,
  listVendors,
  addVendor,
  updateVendor,
  removeVendor,
};
