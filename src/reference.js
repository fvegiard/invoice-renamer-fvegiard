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
  const upperFile = filename.toUpperCase();
  const upperText = text.toUpperCase();

  for (const vendor of load()) {
    const inText = vendor.textPatterns.some((p) => upperText.includes(p.toUpperCase()));
    const inFile = vendor.filenamePatterns.some((p) => new RegExp(p, 'i').test(filename));
    if (inText || inFile) return vendor.name;
  }
  return 'FournisseurInconnu';
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

module.exports = { matchVendor, listVendors, addVendor, updateVendor, removeVendor };
