// Polyfill Map.prototype.getOrInsertComputed — used by tesseract.js but absent in Node <26
if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function (key, fn) {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key);
  };
}

// Polyfill browser globals required by pdfjs-dist in Node.js
const { DOMMatrix, DOMPoint, DOMRect, createCanvas, ImageData } = require('@napi-rs/canvas');
Object.assign(globalThis, { DOMMatrix, DOMPoint, DOMRect, ImageData });

const pdfjsLib = require('pdfjs-dist');
const Tesseract = require('tesseract.js');

const { extractDate, extractVendor, extractInvoiceNumber } = require('./extractors');

let worker = null;

/**
 * Initialize (and reuse) a single Tesseract worker across requests.
 * Loads French + English language data for Quebec invoices.
 */
async function getWorker() {
  if (worker) return worker;
  worker = await Tesseract.createWorker(['fra', 'eng'], 1, {
    logger: () => {},
  });
  return worker;
}

/**
 * Renders the first page of a PDF buffer to a PNG buffer.
 * @param {Buffer} pdfBuffer
 * @param {number} scale - 2.0 gives good OCR quality without being too slow
 * @returns {Promise<Buffer>}
 */
async function renderFirstPage(pdfBuffer, scale = 2.5) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toBuffer('image/png');
}

/**
 * Full pipeline: PDF buffer → rendered image → OCR text → parsed invoice metadata.
 * @param {Buffer} pdfBuffer
 * @param {string} filename - Original filename (used as fallback for vendor/invoice#)
 * @returns {Promise<{date: string, vendor: string, invoiceNumber: string}>}
 */
async function analyzeInvoice(pdfBuffer, filename) {
  const imageBuffer = await renderFirstPage(pdfBuffer);

  const w = await getWorker();
  const { data } = await w.recognize(imageBuffer);
  const text = data.text;

  const date = extractDate(text);
  const vendor = extractVendor(filename, text);
  const invoiceNumber = extractInvoiceNumber(filename);

  return { date, vendor, invoiceNumber };
}

/**
 * Pre-initialize the Tesseract worker so the first invoice doesn't pay the startup cost.
 */
async function warmUp() {
  await getWorker();
  console.log('OCR worker ready (fra + eng)');
}

module.exports = { analyzeInvoice, warmUp };
