/**
 * Génère des PDFs de test réalistes pour les 25 plus gros fournisseurs (format 2026).
 * Chaque PDF simule une vraie facture avec le contenu textuel du fournisseur.
 */
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

// [filename, lines[]]  — filename = nom brut du fournisseur avant renommage
const INVOICES = [
  ['8892642.pdf', [
    { text: 'GUILLEVIN INTERNATIONAL CO.', size: 18, bold: true },
    { text: 'Invoice No: 8892642', size: 13, bold: true },
    { text: 'Date: 2026-03-15', size: 11 },
    { text: 'Bill To: Antigravity DR Electrique', size: 11 },
    { text: 'Electrical supplies — 14 AWG wire, conduit, connectors', size: 11 },
    { text: 'Subtotal: $1,245.00  TPS/TVQ: $248.79  Total: $1,493.79', size: 11 },
  ]],
  ['030677.pdf', [
    { text: 'WESCO DISTRIBUTION CANADA', size: 18, bold: true },
    { text: 'Invoice 030677', size: 13, bold: true },
    { text: 'Account: 68209   Date: 2026-01-03', size: 11 },
    { text: 'Bill To: DR Groupe — Materiel electrique', size: 11 },
    { text: 'Total: $8,422.50', size: 12, bold: true },
  ]],
  ['32046816-00.pdf', [
    { text: 'LUMEN TECHNOLOGIES', size: 18, bold: true },
    { text: 'Invoice 32046816-00', size: 13, bold: true },
    { text: 'Date: January 7, 2026', size: 11 },
    { text: 'Customer: DR Construction', size: 11 },
    { text: 'Lighting materials and fixtures', size: 11 },
    { text: 'Total: $3,814.20', size: 12, bold: true },
  ]],
  ['41520-01692105.pdf', [
    { text: 'RONA INC.', size: 18, bold: true },
    { text: 'Facture 41520-01692105', size: 13, bold: true },
    { text: 'Date: 2026-01-06', size: 11 },
    { text: 'Client: DR Antigravity  Compte: 113231', size: 11 },
    { text: 'Materiel de construction — quincaillerie', size: 11 },
    { text: 'Total: $312.44', size: 12, bold: true },
  ]],
  ['10292.pdf', [
    { text: 'First Nations Electric Inc.', size: 18, bold: true },
    { text: 'Facture No. 10292', size: 13, bold: true },
    { text: 'Date: 2026-02-28', size: 11 },
    { text: 'Client: Groupe DR Electrique', size: 11 },
    { text: 'Travaux electriques — chantier Sainte-Julie', size: 11 },
    { text: 'Total: $38 368.01', size: 12, bold: true },
  ]],
  ['I7501959.pdf', [
    { text: 'FRANKLIN EMPIRE INC.', size: 18, bold: true },
    { text: 'Invoice I7501959', size: 13, bold: true },
    { text: 'Account: 418500-10   Date: 2026-01-08', size: 11 },
    { text: 'Bill To: DR Electrique', size: 11 },
    { text: 'Electrical distribution equipment', size: 11 },
    { text: 'Total: $2,156.88', size: 12, bold: true },
  ]],
  ['0591716.pdf', [
    { text: 'QUINCAILLERIE DEMERS INC.', size: 18, bold: true },
    { text: 'Facture 0591716', size: 13, bold: true },
    { text: 'Compte: 004058   Date: 2026-01-08', size: 11 },
    { text: 'Client: DR Antigravity', size: 11 },
    { text: 'Quincaillerie, fixations, outils', size: 11 },
    { text: 'Total: $847.32', size: 12, bold: true },
  ]],
  ['Facture #15303 - 28-02-2026.pdf', [
    { text: 'YVES GUÉRIN ET FILS', size: 18, bold: true },
    { text: 'Facture #15303', size: 13, bold: true },
    { text: 'Date: 28 fevrier 2026', size: 11 },
    { text: 'Client: Groupe DR', size: 11 },
    { text: 'Travaux electriques sous-traitance — chantier DJ1', size: 11 },
    { text: 'Total: $22,450.00', size: 12, bold: true },
  ]],
  ['284024.pdf', [
    { text: 'DISTRIBUTECK ELECTRIQUE INC.', size: 18, bold: true },
    { text: 'Facture 284024', size: 13, bold: true },
    { text: 'Compte: 9224000   Date: 2026-02-13', size: 11 },
    { text: 'Client: DR Electrique', size: 11 },
    { text: 'Materiel electrique — cable, conduit', size: 11 },
    { text: 'Total: $1,643.00', size: 12, bold: true },
  ]],
  ['30395.pdf', [
    { text: 'SITE INTEGRATION PLUS (GROUPE SIP)', size: 18, bold: true },
    { text: 'Facture 30395', size: 13, bold: true },
    { text: 'Date: 2026-01-21', size: 11 },
    { text: 'Client: DR Alarme Incendie', size: 11 },
    { text: 'Systeme de securite — detection incendie', size: 11 },
    { text: 'Total: $6,210.00', size: 12, bold: true },
  ]],
  ['245874387-013.pdf', [
    { text: 'UNITED RENTALS OF CANADA', size: 18, bold: true },
    { text: 'Invoice 245874387-013', size: 13, bold: true },
    { text: 'Date: February 4, 2026', size: 11 },
    { text: 'Customer: DR Construction', size: 11 },
    { text: 'Heavy equipment rental — excavator', size: 11 },
    { text: 'Total: $14,250.00', size: 12, bold: true },
  ]],
  ['42410899.pdf', [
    { text: 'HARNOIS ÉNERGIES INC.', size: 18, bold: true },
    { text: 'Facture 42410899', size: 13, bold: true },
    { text: 'Compte: 10431119   Date: 2026-01-14', size: 11 },
    { text: 'Client: Groupe DR', size: 11 },
    { text: 'Carburant diesel — livraison chantier', size: 11 },
    { text: 'Total: $3,241.80', size: 12, bold: true },
  ]],
  ['15159.pdf', [
    { text: 'HIGGINS-SMITH TI INC.', size: 18, bold: true },
    { text: 'Facture 15159', size: 13, bold: true },
    { text: 'Date: 2026-02-13', size: 11 },
    { text: 'Client: DR Electrique', size: 11 },
    { text: 'Services informatiques — support reseau, cadrages', size: 11 },
    { text: 'Total: $1,820.00', size: 12, bold: true },
  ]],
  ['18621.pdf', [
    { text: 'BMN MÉCANIQUE GÉNÉRALE', size: 18, bold: true },
    { text: 'Facture 18621', size: 13, bold: true },
    { text: 'Date: 2026-02-10', size: 11 },
    { text: 'Client: DR Antigravity', size: 11 },
    { text: 'Reparation vehicule — camion F-550', size: 11 },
    { text: 'Total: $984.55', size: 12, bold: true },
  ]],
  ['Bell-292044816.pdf', [
    { text: 'BELL CANADA', size: 18, bold: true },
    { text: 'Compte 292044816', size: 13, bold: true },
    { text: 'Date: janvier 2026', size: 11 },
    { text: 'Client: Groupe DR', size: 11 },
    { text: 'Services telephoniques et internet', size: 11 },
    { text: 'Total: $242.04', size: 12, bold: true },
  ]],
  ['19675.pdf', [
    { text: 'GUERIN MAITRE ELECTRICIEN', size: 18, bold: true },
    { text: 'Facture 19675', size: 13, bold: true },
    { text: 'Date: 2026-01-31', size: 11 },
    { text: 'Client: DR Electrique — chantier DJ3, contrat 25-071', size: 11 },
    { text: 'Travaux electricite generale', size: 11 },
    { text: 'Total: $18,200.00', size: 12, bold: true },
  ]],
  ['062848.pdf', [
    { text: 'FORAGE EXPERT QUÉBEC INC.', size: 18, bold: true },
    { text: 'Facture 062848', size: 13, bold: true },
    { text: 'Compte: 15444   Date: 2026-01-09', size: 11 },
    { text: 'Client: DR Construction', size: 11 },
    { text: 'Travaux de forage — installation ancrages', size: 11 },
    { text: 'Total: $5,640.00', size: 12, bold: true },
  ]],
  ['628387.pdf', [
    { text: 'DRUMCO ÉNERGIE INC.', size: 18, bold: true },
    { text: 'Facture 628387', size: 13, bold: true },
    { text: 'Compte: 6910   Date: 2026-01-07', size: 11 },
    { text: 'Client: Groupe DR', size: 11 },
    { text: 'Carburant, lubrifiants — livraison parc vehicules', size: 11 },
    { text: 'Total: $7,812.45', size: 12, bold: true },
  ]],
  ['1-5748186.pdf', [
    { text: "PIÈCES D'AUTOS O. FONTAINE", size: 18, bold: true },
    { text: 'Facture 1-5748186', size: 13, bold: true },
    { text: 'Compte: 2372   Date: 2026-02-11', size: 11 },
    { text: 'Client: DR Entretien vehicules', size: 11 },
    { text: "Pieces de remplacement — filtre, freins", size: 11 },
    { text: 'Total: $318.90', size: 12, bold: true },
  ]],
  ['1689263052.pdf', [
    { text: 'HILTI CANADA CORPORATION', size: 18, bold: true },
    { text: 'Facture 1689263052', size: 13, bold: true },
    { text: 'Compte: 17002604   Date: 2026-01-29', size: 11 },
    { text: 'Client: DR Electrique', size: 11 },
    { text: 'Outils et fixations — ancrages, perforatrices', size: 11 },
    { text: 'Total: $1,204.80', size: 12, bold: true },
  ]],
  ['BE-1313.pdf', [
    { text: 'GROUPE BR DIVISION ÉLECTRIQUE', size: 18, bold: true },
    { text: 'Facture BE-1313', size: 13, bold: true },
    { text: 'Date: 2025-10-17', size: 11 },
    { text: 'Client: DR Electrique', size: 11 },
    { text: 'Travaux electricite — chantier C24-048', size: 11 },
    { text: 'Total: $9,550.00', size: 12, bold: true },
  ]],
  ['IN001128.pdf', [
    { text: 'STANEX INC.', size: 18, bold: true },
    { text: 'Facture IN001128', size: 13, bold: true },
    { text: 'Date: 2026-02-04', size: 11 },
    { text: 'Client: DR Construction', size: 11 },
    { text: 'Materiaux specialises — produits sismiques', size: 11 },
    { text: 'Total: $4,210.00', size: 12, bold: true },
  ]],
  ['1060022-0000583105.pdf', [
    { text: 'E360S / 9386-0120 QUÉBEC INC.', size: 18, bold: true },
    { text: 'Facture 0000583105', size: 13, bold: true },
    { text: 'Compte: 1060022   Date: 2026-01-31', size: 11 },
    { text: 'Client: DR Antigravity', size: 11 },
    { text: 'Location conteneur — depot chantier', size: 11 },
    { text: 'Total: $325.60', size: 12, bold: true },
  ]],
  ['2600142.pdf', [
    { text: 'MOQUIN AMYOT S.E.N.C.R.L.', size: 18, bold: true },
    { text: 'Facture 2600142', size: 13, bold: true },
    { text: 'Date: 2026-01-30', size: 11 },
    { text: 'Client: DR Electrique', size: 11 },
    { text: 'Honoraires professionnels — services juridiques', size: 11 },
    { text: 'Total: $15,271.56', size: 12, bold: true },
  ]],
  ['90023031.pdf', [
    { text: 'J-SPEC ATELIER MÉCANIQUE', size: 18, bold: true },
    { text: 'Facture 90023031', size: 13, bold: true },
    { text: 'Date: 2026-02-11', size: 11 },
    { text: 'Client: DR Parc Vehicules', size: 11 },
    { text: 'Entretien et reparation — camion Ford F-450', size: 11 },
    { text: 'Total: $2,841.30', size: 12, bold: true },
  ]],
];

async function main() {
  // Clean previous PDFs
  fs.readdirSync(outDir).filter(f => f.endsWith('.pdf')).forEach(f => fs.unlinkSync(path.join(outDir, f)));

  console.log(`\nGénération de ${INVOICES.length} PDFs de test...\n`);
  for (const [filename, lines] of INVOICES) {
    await makeInvoice(filename, lines);
    console.log(`  ✓ ${filename}`);
  }
  console.log(`\n✅ ${INVOICES.length} PDFs créés dans test/pdfs/\n`);
}

main().catch(console.error);
