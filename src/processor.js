const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const config = require('./config');
const { build2026Filename } = require('./naming');
const { extractDate, extractVendor, extractInvoiceNumber } = require('./extractors');

async function processInvoices() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const files = fs
    .readdirSync(config.sourceDir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found in', config.sourceDir);
    return;
  }

  const results = await Promise.allSettled(files.map((file) => processFile(file)));

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`❌ ${files[i]}: ${result.reason.message}`);
    }
  });
}

async function processFile(filename) {
  const srcPath = path.join(config.sourceDir, filename);
  const dataBuffer = fs.readFileSync(srcPath);
  const { text } = await pdf(dataBuffer);

  const dateStr = extractDate(text);
  const vendorName = extractVendor(filename, text);
  const invoiceNumber = extractInvoiceNumber(filename);
  const naming = build2026Filename({
    date: dateStr,
    vendor: vendorName,
    invoiceNumber,
    sourceText: text,
  });

  const newFilename = naming.renamed;
  const destPath = path.join(config.outputDir, newFilename);

  fs.copyFileSync(srcPath, destPath);
  console.log(`✅ ${filename} => ${newFilename}`);
}

module.exports = { processInvoices };
