const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function makeInvoice(filename, lines) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    const out = fs.createWriteStream(path.join(outDir, filename));
    doc.pipe(out);
    lines.forEach(({ text, size = 11, bold = false, gap = 4 }) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).text(text);
      doc.moveDown(gap / 14);
    });
    doc.end();
    out.on('finish', resolve);
  });
}

async function main() {
  await makeInvoice('Inv8892642.pdf', [
    { text: 'GUILLEVIN INTERNATIONAL CO.', size: 18, bold: true },
    { text: '2026-04-01', size: 12 },
    { text: 'INVOICE / FACTURE', size: 14, bold: true },
    { text: 'Invoice No: 8892642', size: 12 },
    { text: 'Bill To: Antigravity DR', size: 11 },
    { text: 'Description: Electrical supplies — 14 AWG wire, connectors', size: 11 },
    { text: 'Subtotal: $1,245.00', size: 11 },
    { text: 'TPS/TVQ: $248.79', size: 11 },
    { text: 'Total: $1,493.79', size: 12, bold: true },
  ]);

  await makeInvoice('Facture15303_de_HigginsSmith_TI_inc.pdf', [
    { text: 'HigginsSmith TI inc', size: 18, bold: true },
    { text: 'DATE: 2026-03-10', size: 12 },
    { text: 'FACTURE No. 15303', size: 14, bold: true },
    { text: 'Client: DR Construction', size: 11 },
    { text: 'Services informatiques — support réseau Q1 2026', size: 11 },
    { text: 'Montant: $3,200.00', size: 11 },
    { text: 'TPS: $160.00   TVQ: $319.36', size: 11 },
    { text: 'TOTAL: $3,679.36', size: 12, bold: true },
  ]);

  console.log('✅ Test PDFs created in test/pdfs/');
}

main().catch(console.error);
