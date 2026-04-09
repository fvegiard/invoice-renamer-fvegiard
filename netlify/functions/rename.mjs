import { createRequire } from 'module';
import OpenAI from 'openai';

// @napi-rs/canvas is CommonJS native — use createRequire inside ESM
const require = createRequire(import.meta.url);
const { DOMMatrix, DOMPoint, DOMRect, createCanvas, ImageData } = require('@napi-rs/canvas');

// pdfjs-dist needs browser globals polyfilled in Node.js
Object.assign(globalThis, { DOMMatrix, DOMPoint, DOMRect, ImageData });

import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const PREFIX = 'DR';
const MODEL  = process.env.OPENAI_MODEL || 'gpt-4.1';

const PROMPT = `Tu es un assistant spécialisé dans les factures commerciales québécoises.
Regarde cette image de facture et extrais précisément:

1. DATE de la facture au format YY.MM.DD (ex: 26.03.15 pour le 15 mars 2026)
2. NOM EXACT du fournisseur tel qu'il apparaît sur la facture (ex: Guillevin International Co, Bell Canada, United Rentals)
3. NUMÉRO de facture (ex: 8892642, I7501959, 030677, IN001128)

Réponds UNIQUEMENT en JSON strict, sans texte autour:
{"date":"YY.MM.DD","vendor":"NomFournisseur","invoiceNumber":"XXXXX"}

Si une valeur est introuvable, utilise: "" pour vendor/invoiceNumber, "YY.MM.DD" pour date.`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Renders the first page of a PDF buffer to a PNG buffer.
 */
async function pdfToPng(pdfBuffer, scale = 1.5) {
  const doc  = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const page = await doc.getPage(1);
  const vp   = page.getViewport({ scale });

  const canvas = createCanvas(vp.width, vp.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

  return canvas.toBuffer('image/png');
}

/**
 * Sends a PNG image to OpenAI Vision and returns invoice metadata.
 */
async function analyzeWithVision(pngBuffer) {
  const base64 = pngBuffer.toString('base64');

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'high' } },
      ],
    }],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  return JSON.parse(response.choices[0].message.content);
}

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: 'OPENAI_API_KEY non configurée sur Netlify.' }) };
  }

  try {
    const { files } = JSON.parse(event.body);

    // Process one at a time to avoid memory spikes on serverless
    const results = [];
    for (const { name, data } of files) {
      try {
        const pdfBuffer = Buffer.from(data, 'base64');

        // 1. PDF → PNG
        const pngBuffer = await pdfToPng(pdfBuffer);
        const preview   = pngBuffer.toString('base64');

        // 2. PNG → OpenAI Vision → metadata
        const { date, vendor, invoiceNumber } = await analyzeWithVision(pngBuffer);

        const dateStr    = date          || 'YY.MM.DD';
        const vendorName = vendor        || 'FournisseurInconnu';
        const invNum     = invoiceNumber || '00000';
        const renamed    = `${dateStr} - ${PREFIX} - ${invNum} - ${vendorName}.pdf`;

        results.push({
          original: name,
          renamed,
          data,        // original PDF for download
          preview,     // PNG thumbnail (base64)
          status: 'ok',
          date: dateStr,
          vendor: vendorName,
          invoiceNumber: invNum,
        });
      } catch (err) {
        results.push({ original: name, status: 'error', message: err.message });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
