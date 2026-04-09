/**
 * Pipeline test: lit les PDFs de test/pdfs/, extrait le texte, applique
 * extractors.js (date, vendor, invoiceNumber) et affiche le nom renommé.
 * Aucune clé API requise — utilise uniquement le matching local.
 */
const fs      = require('fs');
const path    = require('path');

// pdfjs-dist needs browser globals in Node
const { DOMMatrix, DOMPoint, DOMRect, createCanvas, ImageData } = require('@napi-rs/canvas');
Object.assign(globalThis, { DOMMatrix, DOMPoint, DOMRect, ImageData });
const pdfjsLib = require('pdfjs-dist');

const { extractDate, extractVendor, extractInvoiceNumber } = require('../src/extractors');
const { prefix } = require('../src/config');

async function extractText(buffer) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  let text = '';
  for (let i = 1; i <= Math.min(doc.numPages, 2); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

const pdfsDir = path.join(__dirname, 'pdfs');
const files   = fs.readdirSync(pdfsDir).filter(f => f.toLowerCase().endsWith('.pdf')).sort();

async function main() {
  console.log(`\n${BOLD}Pipeline test — ${files.length} facture(s)${RESET}\n`);
  console.log('─'.repeat(72));

  let ok = 0, warn = 0;

  for (const file of files) {
    const buffer  = fs.readFileSync(path.join(pdfsDir, file));
    const pdfText = await extractText(buffer);
    // Combine PDF text + filename so date patterns can match dates in filenames too
    const text    = file + '\n' + pdfText;

    const date    = extractDate(text);
    const vendor  = extractVendor(file, text);
    const invNum  = extractInvoiceNumber(file);
    const renamed = `${date} - ${prefix} - ${invNum} - ${vendor}.pdf`;

    const dateOk   = date !== 'YY.MM.DD';
    const vendorOk = vendor !== 'FournisseurInconnu';
    const invOk    = invNum !== '00000';

    const icon = (vendorOk && dateOk && invOk) ? `${GREEN}✓${RESET}` :
                 vendorOk ? `${YELLOW}~${RESET}` : `${RED}✗${RESET}`;

    if (vendorOk && dateOk && invOk) ok++;
    else warn++;

    console.log(`\n${icon} ${BOLD}${file}${RESET}`);
    console.log(`  Fournisseur : ${vendorOk ? GREEN : RED}${vendor}${RESET}`);
    console.log(`  Date        : ${dateOk   ? GREEN : YELLOW}${date}${RESET}`);
    console.log(`  N° facture  : ${invOk    ? GREEN : YELLOW}${invNum}${RESET}`);
    console.log(`  → ${BOLD}${renamed}${RESET}`);
  }

  console.log('\n' + '─'.repeat(72));
  console.log(`\n${BOLD}Résultat: ${GREEN}${ok} complets${RESET}${BOLD}, ${warn > 0 ? YELLOW : GREEN}${warn} partiels${RESET}${BOLD} / ${files.length} total${RESET}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
