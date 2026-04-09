const fs = require('fs');
const path = require('path');
const { analyzeInvoice } = require('../src/ocr');

const config = require('../src/config');

const pdfsDir = path.join(__dirname, 'pdfs');
const files = fs.readdirSync(pdfsDir).filter(f => f.toLowerCase().endsWith('.pdf'));

async function main() {
  console.log(`\nTest pipeline OCR — ${files.length} fichier(s)\n`);

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(pdfsDir, file));
    console.log(`📄 ${file}`);

    try {
      const { date, vendor, invoiceNumber } = await analyzeInvoice(buffer, file);
      const newName = `${date} - ${config.prefix} - ${invoiceNumber} - ${vendor}.pdf`;
      console.log(`   → ${newName}\n`);
    } catch (e) {
      console.error(`   ❌ Erreur: ${e.message}\n`);
    }
  }

  process.exit(0);
}

main();
