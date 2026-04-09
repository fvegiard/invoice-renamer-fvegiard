const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'vendors.json');
const vendors = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Patches based on 2026 renamed files format: 26.MM.DD - DR - [compte] - [facture] - [chantier] - [Fournisseur].pdf
const patches = [
  {
    id: 'guillevin',
    // 2026 invoices: 8546042, 8565008, 8570751, 8593534 → 7 chiffres commençant par 8 (ou 7)
    // Comptes: 103660, 75029, 107313, 121804, 111685, 111682, 115061
    textPatterns: ['GUILLEVIN', 'GUILLEVIN INTERNATIONAL'],
    filenamePatterns: ['^[78][0-9]{6}']
  },
  {
    id: 'wesco',
    // 2026 invoices: 1141855, 1142083 (7 chiffres) et 030677, 031109 (6 chiffres commençant par 0)
    // Comptes: 68209, 68229, 68230
    textPatterns: ['WESCO'],
    filenamePatterns: ['^1141[0-9]{3}', '^03[0-9]{4}$']
  },
  {
    id: 'lumen',
    // 2026 invoices: 32046816-00, 32051345-00, 32067798-00 → commencent par 32 (aussi 30, 31)
    textPatterns: ['LUMEN'],
    filenamePatterns: ['^3[0-9]{7,9}']
  },
  {
    id: 'rona',
    // 2026 invoices: 41520-01692105, 43030-01219843, 999-90465124 → compte 113231
    textPatterns: ['RONA'],
    filenamePatterns: ['^4[13][0-9]{3}-', '^999-']
  },
  {
    id: 'first-nations-electric',
    // 2026: Facture 10292 → numéros en 10xxx
    textPatterns: ['FIRST NATIONS ELECTRIC', 'FIRST NATION'],
    filenamePatterns: ['^1[0-9]{4}$', '^fact [0-9]+']
  },
  {
    id: 'franklin-empire',
    // 2026 invoices: I7501959, I7506155, I7509722, I7527611 (commence par I7 ou I5)
    // Crédits: CN1975770, CN1976676 (commence par CN)
    // Compte: 418500-10
    textPatterns: ['FRANKLIN EMPIRE'],
    filenamePatterns: ['^I[0-9]+', '^CN[0-9]+']
  },
  {
    id: 'quincaillerie-demers',
    // 2026 invoices: 0591552, 0591668, 0591716, 0591991, 0592069 → 7 chiffres commençant par 059
    // Compte: 004058
    textPatterns: ['QUINCAILLERIE DEMERS', 'DEMERS'],
    filenamePatterns: ['^059[0-9]{4}']
  },
  {
    // Yves Guérin — factures comme "Facture #12883 - 25-11-2020.pdf"
    id: 'yves-guerin-maitre-electricien',
    textPatterns: ['YVES GUERIN', 'YVES GUÉRIN', 'GUERIN ET FILS', 'GUÉRIN ET FILS'],
    filenamePatterns: ['^Facture #[0-9]+']
  },
  {
    id: 'distributeck',
    // 2026 invoices: 283709, 284024, 284063, 284159, 284173 → 6 chiffres commençant par 28
    // Compte: 9224000
    textPatterns: ['DISTRIBUTECK', 'DISTRIBUTEK'],
    filenamePatterns: ['^28[0-9]{4}$']
  },
  {
    id: 'groupe-sip',
    // 2026 invoices: 30385, 30387, 30395, 30451, 30493, 30544, 30545 → 5 chiffres commençant par 30
    // Aussi "SIP XXXXX" dans certains anciens fichiers
    textPatterns: ['GROUPE SIP', 'SITE INTEGRATION PLUS'],
    filenamePatterns: ['^30[0-9]{3}$', '^SIP [0-9]+']
  },
  {
    id: 'united-rental',
    // 2026 invoices: 245874387-012, 245874387-013 → numéro de commande fixe 245874387
    textPatterns: ['UNITED RENTALS', 'UNITED RENTAL'],
    filenamePatterns: ['^245874387-']
  },
  {
    id: 'harnois-energies',
    // 2026 invoices: 42410899, 42410900 → 8 chiffres commençant par 424
    // Comptes: 10431119, 10661153, 10706259
    textPatterns: ['HARNOIS ENERGIES', 'HARNOIS ÉNERGIES', 'HARNOIS'],
    filenamePatterns: ['^424[0-9]{5}']
  },
  {
    id: 'higgins-smith-ti-inc',
    // 2026 invoices: 14927, 15010, 15097, 15159, 15248 → 5 chiffres commençant par 14 ou 15
    textPatterns: ['HIGGINS-SMITH', 'HIGGINSSMITH'],
    filenamePatterns: ['^1[45][0-9]{3}$']
  },
  {
    id: 'bmn-mecanique-generale-2021',
    // 2026 invoices: 18490, 18512, 18549, 18621 → 5 chiffres commençant par 18
    textPatterns: ['BMN', 'MECANIQUE GENERALE BMN', 'BMN MECANIQUE'],
    filenamePatterns: ['^1[89][0-9]{3}$']
  },
  {
    id: 'bell',
    // Pas de factures raw — seulement des paiements
    // Comptes: 292044816, 508193889, 555023403, 4509224000773, 8455200510139248
    textPatterns: ['BELL CANADA', 'BELL MOBILITE', 'BELL MOBILITÉ'],
    filenamePatterns: ['BELL']
  },
  {
    id: 'guerin-maitre-electricien',
    // 2026 invoices: 19490, 19591, 19592, 19675, 19673, 19747 → 5 chiffres commençant par 19
    textPatterns: ['GUERIN MAITRE ELECTRICIEN', 'GUÉRIN MAITRE ÉLECTRICIEN'],
    filenamePatterns: ['^19[0-9]{3}$']
  },
  {
    id: 'forage-expert-quebec',
    // 2026 invoices: 062845, 062846, 062847, 062848 → 6 chiffres commençant par 06
    // Compte: 15444
    textPatterns: ['FORAGE EXPERT'],
    filenamePatterns: ['^06[0-9]{4}$']
  },
  {
    id: 'drumco-energie',
    // 2026 invoices: 627275, 627277, 628387, 628474, 628665, 628789, 629859 → 6 chiffres commençant par 62/62
    // Compte: 6910
    textPatterns: ['DRUMCO'],
    filenamePatterns: ['^62[0-9]{4}$']
  },
  {
    id: 'pieces-d-autos-o-fontaine',
    // 2026 invoices: 1-5742904, 1-5748186, 1-5749267 → commence par "1-57"
    // Compte: 2372
    textPatterns: ["PIECES D'AUTO", 'O. FONTAINE', 'O.FONTAINE', 'FONTAINE'],
    filenamePatterns: ['^1-5[0-9]+']
  },
  {
    id: 'hilti',
    // 2026 invoices: 1689237557, 1689257450, 1689263052, 1689272935 → 10 chiffres commençant par 168
    // Comptes: 1420, 17002604
    textPatterns: ['HILTI'],
    filenamePatterns: ['^168[0-9]{7}']
  },
  {
    id: 'br-electrique',
    // Factures: BE-1164, BE-1165, BE-1313 → commence par "BE-"
    textPatterns: ['GROUPE BR', 'BR ELECTRIQUE', 'BR ÉLECTRIQUE'],
    filenamePatterns: ['^BE-[0-9]+']
  },
  {
    id: 'stanex',
    // 2026 invoices: IN000853, IN001051, IN001128, IN001137 → commence par "IN"
    // Anciens: 151624-3849, 150086 — mais en 2026 le format a changé vers IN
    textPatterns: ['STANEX'],
    filenamePatterns: ['^IN[0-9]+', '^15[0-9]{4}']
  },
  {
    id: 'le-geant-du-conteneur-e360s-9386-0120-quebec-inc',
    // 2026 invoices: 1060022-0000583105 → compte 1060022 suivi du numéro
    // Aussi "E360S" et "9386-0120"
    textPatterns: ['E360S', 'LE GEANT DU CONTENEUR', '9386-0120'],
    filenamePatterns: ['^1060022-', '^53[0-9]{4}$']
  },
  {
    id: 'moquin-amyot-s-e-n-c-r-l',
    // 2026 invoices: 2600142 → 7 chiffres commençant par 26 (avant c'était 24xxxxx)
    textPatterns: ['MOQUIN AMYOT'],
    filenamePatterns: ['^2[46][0-9]{5}$']
  },
  {
    id: 'j-spec',
    // 2026 invoices: 90023031 → 8 chiffres commençant par 9002
    textPatterns: ['J-SPEC', 'J SPEC'],
    filenamePatterns: ['^9002[0-9]{4}']
  }
];

let patched = 0;
for (const patch of patches) {
  const idx = vendors.findIndex(v => v.id === patch.id);
  if (idx !== -1) {
    vendors[idx] = { ...vendors[idx], ...patch };
    console.log(`✓ Patché: ${vendors[idx].name}`);
    patched++;
  } else {
    console.warn(`✗ Introuvable: ${patch.id}`);
  }
}

fs.writeFileSync(FILE, JSON.stringify(vendors, null, 2), 'utf8');
console.log(`\n${patched}/${patches.length} fournisseurs mis à jour.`);
