/**
 * Tests de reconnaissance fournisseurs — top 25 par volume 2026
 * Teste filenamePatterns (nom de fichier) ET textPatterns (contenu PDF)
 */
const { matchVendor } = require('../src/reference');

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

// Cas de test: [filename, pdfText, expectedVendorName]
// filename = nom du fichier brut tel que reçu du fournisseur
// pdfText  = extrait du contenu textuel de la facture
const TESTS = [
  // ── Guillevin ──────────────────────────────────────────────────────────────
  ['8892642.pdf',       'GUILLEVIN INTERNATIONAL CO.\n2026-03-15\nInvoice No. 8892642',    'Guillevin'],
  ['7823451.pdf',       'GUILLEVIN INTERNATIONAL CO.\nFacture No: 7823451',                'Guillevin'],

  // ── Wesco ──────────────────────────────────────────────────────────────────
  ['030677.pdf',        'WESCO DISTRIBUTION CANADA\nCompte: 68209\nFacture 030677',        'Wesco'],
  ['1141855.pdf',       'WESCO\nInvoice 1141855',                                          'Wesco'],

  // ── Lumen ──────────────────────────────────────────────────────────────────
  ['32046816-00.pdf',   'LUMEN\nInvoice 32046816-00',                                      'Lumen'],
  ['30689216-00.pdf',   'LUMEN TECHNOLOGIES\nFacture 30689216',                            'Lumen'],

  // ── Rona ───────────────────────────────────────────────────────────────────
  ['41520-01692105.pdf','RONA INC.\nFacture 41520-01692105',                               'Rona'],
  ['43030-01219843.pdf','RONA\nInvoice 43030-01219843',                                    'Rona'],

  // ── First Nations Electric ─────────────────────────────────────────────────
  ['10292.pdf',         'First Nations Electric Inc.\nFacture No. 10292\n2026-02-28',      'First nations electric'],
  ['fact 9667.pdf',     'FIRST NATIONS ELECTRIC\nFact 9667',                              'First nations electric'],

  // ── Franklin Empire ────────────────────────────────────────────────────────
  ['I7501959.pdf',      'FRANKLIN EMPIRE INC.\nInvoice I7501959\nCompte 418500-10',        'Franklin Empire'],
  ['CN1975770.pdf',     'FRANKLIN EMPIRE\nCredit Note CN1975770',                          'Franklin Empire'],

  // ── Quincaillerie Demers ───────────────────────────────────────────────────
  ['0591716.pdf',       'QUINCAILLERIE DEMERS INC.\nFacture 0591716\nCompte 004058',       'Quincaillerie Demers'],
  ['0592437.pdf',       'QUINCAILLERIE DEMERS\nFacture No: 0592437',                       'Quincaillerie Demers'],

  // ── Yves Guérin ────────────────────────────────────────────────────────────
  ['Facture #15303 - 28-02-2026.pdf', 'YVES GUÉRIN MAITRE ÉLECTRICIEN\nFacture #15303',   'Yves Guérin Maitre électricien'],

  // ── Distributeck ───────────────────────────────────────────────────────────
  ['284024.pdf',        'DISTRIBUTECK ELECTRIQUE INC.\nFacture 284024\nCompte 9224000',    'Distributeck'],
  ['283709.pdf',        'DISTRIBUTEK\nInvoice 283709',                                     'Distributeck'],

  // ── Groupe SIP ─────────────────────────────────────────────────────────────
  ['30395.pdf',         'SITE INTEGRATION PLUS\nGroupe SIP\nFacture 30395',                'Groupe SIP'],
  ['30544.pdf',         'GROUPE SIP\nFacture 30544',                                       'Groupe SIP'],

  // ── United Rental ──────────────────────────────────────────────────────────
  ['245874387-013.pdf', 'UNITED RENTALS OF CANADA\nInvoice 245874387-013',                 'United Rental'],
  ['245874387-014.pdf', 'UNITED RENTALS\nFacture 245874387-014',                           'United Rental'],

  // ── Harnois Energies ───────────────────────────────────────────────────────
  ['42410899.pdf',      'HARNOIS ÉNERGIES INC.\nFacture 42410899\nCompte 10431119',        'Harnois energies'],
  ['42500001.pdf',      'HARNOIS ENERGIES\nInvoice 42500001',                              'Harnois energies'],

  // ── Higgins-Smith ──────────────────────────────────────────────────────────
  ['15159.pdf',         'HIGGINS-SMITH TI INC.\nFacture 15159',                            'Higgins-Smith TI inc'],
  ['14927.pdf',         'HIGGINSSMITH TI\nInvoice 14927',                                  'Higgins-Smith TI inc'],

  // ── BMN Mécanique ──────────────────────────────────────────────────────────
  ['18621.pdf',         'BMN MÉCANIQUE GÉNÉRALE\nFacture 18621',                           'BMN Mécanique générale 2021'],
  ['18490.pdf',         'BMN\nInvoice 18490',                                              'BMN Mécanique générale 2021'],

  // ── Bell ───────────────────────────────────────────────────────────────────
  ['Bell-292044816.pdf','BELL CANADA\nCompte 292044816\nFacture mensuelle',                'Bell'],

  // ── Guérin Maitre Électricien ──────────────────────────────────────────────
  ['19675.pdf',         'GUERIN MAITRE ELECTRICIEN\nFacture 19675',                        'Guerin Maitre Electricien'],
  ['19490.pdf',         'GUÉRIN MAITRE ÉLECTRICIEN\nInvoice 19490',                        'Guerin Maitre Electricien'],

  // ── Forage Expert Québec ───────────────────────────────────────────────────
  ['062848.pdf',        'FORAGE EXPERT QUÉBEC INC.\nFacture 062848\nCompte 15444',         'Forage Expert Québec'],
  ['062851.pdf',        'FORAGE EXPERT\nInvoice 062851',                                   'Forage Expert Québec'],

  // ── Drumco Énergie ─────────────────────────────────────────────────────────
  ['628387.pdf',        'DRUMCO ÉNERGIE INC.\nFacture 628387\nCompte 6910',                'Drumco Energie'],
  ['629859.pdf',        'DRUMCO\nInvoice 629859',                                          'Drumco Energie'],

  // ── Pièces D\'Autos O. Fontaine ────────────────────────────────────────────
  ['1-5748186.pdf',     "PIECES D'AUTOS O. FONTAINE\nFacture 1-5748186\nCompte 2372",      "Pieces D'Autos O. Fontaine"],
  ['1-5749267.pdf',     "O. FONTAINE\nInvoice 1-5749267",                                  "Pieces D'Autos O. Fontaine"],

  // ── Hilti ──────────────────────────────────────────────────────────────────
  ['1689263052.pdf',    'HILTI CANADA CORPORATION\nFacture 1689263052\nCompte 17002604',   'Hilti'],
  ['1689284377.pdf',    'HILTI\nInvoice 1689284377',                                       'Hilti'],

  // ── BR Électrique ──────────────────────────────────────────────────────────
  ['BE-1313.pdf',       'GROUPE BR DIVISION ÉLECTRIQUE\nFacture BE-1313',                  'BR Electrique'],
  ['BE-1254.pdf',       'BR ÉLECTRIQUE\nInvoice BE-1254',                                  'BR Electrique'],

  // ── Stanex ─────────────────────────────────────────────────────────────────
  ['IN001128.pdf',      'STANEX INC.\nFacture IN001128',                                   'Stanex'],
  ['IN000853.pdf',      'STANEX\nInvoice IN000853',                                        'Stanex'],

  // ── Le Géant du Conteneur (E360S) ──────────────────────────────────────────
  ['1060022-0000583105.pdf', 'E360S\n9386-0120 QUÉBEC INC.\nFacture 0000583105',           'le geant du conteneur E360S-9386-0120 Québec inc'],
  ['536850.pdf',             'LE GEANT DU CONTENEUR\nFacture 536850',                      'le geant du conteneur E360S-9386-0120 Québec inc'],

  // ── Moquin Amyot ───────────────────────────────────────────────────────────
  ['2600142.pdf',       'MOQUIN AMYOT S.E.N.C.R.L.\nFacture 2600142',                     'Moquin Amyot S.E.N.C.R.L'],
  ['2403162.pdf',       'MOQUIN AMYOT\nInvoice 2403162',                                   'Moquin Amyot S.E.N.C.R.L'],

  // ── J-Spec ─────────────────────────────────────────────────────────────────
  ['90023031.pdf',      'J-SPEC ATELIER MÉCANIQUE\nFacture 90023031',                      'J-Spec'],
  ['90019753.pdf',      'J SPEC\nInvoice 90019753',                                        'J-Spec'],
];

let passed = 0;
let failed = 0;
const failures = [];

console.log(`\n${BOLD}Tests reconnaissance fournisseurs — top 25 (2026)${RESET}\n`);
console.log('─'.repeat(72));

for (const [filename, pdfText, expected] of TESTS) {
  const result = matchVendor(filename, pdfText);
  const ok = result === expected;
  if (ok) {
    passed++;
    console.log(`${GREEN}✓${RESET} ${filename.padEnd(38)} → ${result}`);
  } else {
    failed++;
    failures.push({ filename, expected, got: result });
    console.log(`${RED}✗${RESET} ${filename.padEnd(38)} attendu: ${RED}${expected}${RESET}  obtenu: ${result}`);
  }
}

console.log('\n' + '─'.repeat(72));
console.log(`\n${BOLD}Résultat: ${GREEN}${passed} passés${RESET}${BOLD}, ${failed > 0 ? RED : GREEN}${failed} échoués${RESET}${BOLD} / ${TESTS.length} total${RESET}\n`);

if (failures.length > 0) {
  console.log(`${RED}${BOLD}Échecs à corriger:${RESET}`);
  failures.forEach(({ filename, expected, got }) => {
    console.log(`  • ${filename}`);
    console.log(`    Attendu : ${expected}`);
    console.log(`    Obtenu  : ${got}`);
  });
  console.log();
  process.exit(1);
}
