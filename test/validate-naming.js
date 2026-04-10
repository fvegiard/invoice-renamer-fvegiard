const fs = require('fs');
const path = require('path');

const { extractPdfText } = require('../src/pdf-text');
const { extractDate, extractVendor, extractInvoiceNumber } = require('../src/extractors');
const { build2026Filename } = require('../src/naming');

const pdfsDir = path.join(__dirname, 'pdfs');

const cases = [
  {
    file: 'Inv8892642.pdf',
    expected: '26.04.01 - DR - 18999 - 8892642 - 7078 - Guillevin.pdf',
  },
  {
    file: 'Wesco1143168.pdf',
    expected: '26.04.02 - DR - 68229 - 1143168 - 10982 - Wesco.pdf',
  },
  {
    file: 'UnitedRental245874387013.pdf',
    expected: '26.02.04 - DR - 245874387-013 - 5823 - United Rentals.pdf',
  },
  {
    file: 'Sirois201629553.pdf',
    expected: '26.01.13 - DR - 2016-29553 - Securite Sirois.pdf',
  },
  {
    file: 'Facture15303_de_HigginsSmith_TI_inc.pdf',
    expected: '26.03.10 - DR - 15303 - HigginsSmith TI inc.pdf',
  },
];

async function main() {
  let failures = 0;

  for (const testCase of cases) {
    const buffer = fs.readFileSync(path.join(pdfsDir, testCase.file));
    const sourceText = await extractPdfText(buffer);
    const actual = build2026Filename({
      date: extractDate(sourceText),
      vendor: extractVendor(testCase.file, sourceText),
      invoiceNumber: extractInvoiceNumber(testCase.file),
      sourceText,
    }).renamed;

    if (actual !== testCase.expected) {
      failures++;
      console.error(`FAIL ${testCase.file}`);
      console.error(`  expected: ${testCase.expected}`);
      console.error(`  actual:   ${actual}`);
      continue;
    }

    console.log(`PASS ${testCase.file} -> ${actual}`);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
