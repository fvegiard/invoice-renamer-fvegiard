require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const config = require('./src/config');
const { analyzeInvoice, warmUp } = require('./src/ocr');
const reference = require('./src/reference');
const knowledge = require('./src/knowledge');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveUniquePath(dir, filename) {
  let dest = path.join(dir, filename);
  if (!fs.existsSync(dest)) return dest;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(dir, `${base} (${i})${ext}`);
    i++;
  }
  return dest;
}

// ─── Invoice rename ───────────────────────────────────────────────────────────

app.post('/rename', upload.array('files'), async (req, res) => {
  if (!fs.existsSync(config.outputDirNew)) {
    fs.mkdirSync(config.outputDirNew, { recursive: true });
  }

  const results = await Promise.allSettled(
    req.files.map(async (file) => {
      try {
        const { date, vendor, invoiceNumber } = await analyzeInvoice(file.buffer, file.originalname);

        const newFilename = `${date} - ${config.prefix} - ${invoiceNumber} - ${vendor}.pdf`;
        const destPath = resolveUniquePath(config.outputDirNew, newFilename);
        fs.writeFileSync(destPath, file.buffer);

        const renamed = path.basename(destPath);
        knowledge.record({ original: file.originalname, renamed, date, vendor, invoiceNumber, status: 'ok' });

        return { original: file.originalname, renamed, status: 'ok' };
      } catch (err) {
        knowledge.record({ original: file.originalname, renamed: null, status: 'error', message: err.message });
        throw err;
      }
    })
  );

  res.json(
    results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { original: req.files[i].originalname, status: 'error', message: r.reason.message }
    )
  );
});

// ─── Reference API (vendor catalog) ──────────────────────────────────────────

app.get('/api/vendors', (_req, res) => {
  res.json(reference.listVendors());
});

app.post('/api/vendors', (req, res) => {
  try {
    res.status(201).json(reference.addVendor(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/vendors/:id', (req, res) => {
  try {
    res.json(reference.updateVendor(req.params.id, req.body));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.delete('/api/vendors/:id', (req, res) => {
  try {
    reference.removeVendor(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ─── Knowledge API (history + stats) ─────────────────────────────────────────

app.get('/api/history', (_req, res) => {
  res.json(knowledge.getHistory());
});

app.get('/api/stats', (_req, res) => {
  res.json(knowledge.getStats());
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\nDR Factures  →  http://localhost:${PORT}`);
  console.log('Reference API  →  GET /api/vendors');
  console.log('Knowledge API  →  GET /api/history  |  GET /api/stats\n');
  // Warm up Tesseract in the background so the first invoice is fast
  warmUp().catch(() => {});
});
