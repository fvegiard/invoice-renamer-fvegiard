require('dotenv').config();

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
const OpenAI = require('openai');

const config = require('./config');
const { canonicalizeVendor } = require('./reference');
const { extractPdfText } = require('./pdf-text');

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing AI API key');

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

const PROMPT = `Tu analyses une facture commerciale québécoise. Extrais précisément:
1. La DATE de la facture au format YY.MM.DD (ex: 26.04.01 pour le 1er avril 2026)
2. Le NOM du fournisseur (ex: Guillevin International, Bell, United Rentals, Wesco)
3. Le NUMÉRO de facture (chiffres seulement, ex: 8892642)

Réponds uniquement en JSON strict:
{"date":"YY.MM.DD","vendor":"NomFournisseur","invoiceNumber":"XXXXX"}

Si une valeur est introuvable: "" pour vendor/invoiceNumber, "YY.MM.DD" pour date.`;

/**
 * Renders the first page of a PDF buffer to a high-res PNG buffer.
 * @param {Buffer} pdfBuffer
 * @param {number} scale - Render scale (2.0 = 2x for better OCR quality)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function renderFirstPage(pdfBuffer, scale = 2.0) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toBuffer('image/png');
}

/**
 * Sends a PNG image to OpenAI Vision and extracts invoice metadata.
 * @param {Buffer} imageBuffer
 * @returns {Promise<{date: string, vendor: string, invoiceNumber: string}>}
 */
async function callVision(imageBuffer) {
  const base64 = imageBuffer.toString('base64');
  const client = getClient();

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64}`, detail: 'high' },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Full pipeline: PDF buffer → rendered image → vision analysis → invoice metadata.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{date: string, vendor: string, invoiceNumber: string}>}
 */
async function analyzeInvoice(pdfBuffer, filename = '') {
  const imageBuffer = await renderFirstPage(pdfBuffer);
  const result = await callVision(imageBuffer);
  const sourceText = await extractPdfText(pdfBuffer).catch(() => '');

  return {
    ...result,
    vendor: canonicalizeVendor(result.vendor, filename, sourceText),
    sourceText,
  };
}

module.exports = { analyzeInvoice };
