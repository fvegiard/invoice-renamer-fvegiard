import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { getStore } from '@netlify/blobs';

const require = createRequire(import.meta.url);
const { createCanvas, Image, ImageData, DOMMatrix, DOMPoint, DOMRect } = require('@napi-rs/canvas');

// Polyfills for pdfjs-dist in Node environment
Object.assign(globalThis, { 
  createCanvas, Image, ImageData, DOMMatrix, DOMPoint, DOMRect 
});

const functionDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(functionDir, '../../src');

const [{ canonicalizeVendor }, { build2026Filename }] = await Promise.all([
  import(pathToFileURL(path.join(srcDir, 'reference.js')).href),
  import(pathToFileURL(path.join(srcDir, 'naming.js')).href),
]);

// Need to import pdfjs-dist legacy build for Node
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function getLearningExamples() {
  try {
    const store = getStore('dr-factures');
    const raw = await store.get('learning_examples');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const BASE_PROMPT = `Tu es un assistant spécialisé dans les factures commerciales québécoises.
Regarde cette image de facture et extrais précisément:

1. DATE de la facture au format YY.MM.DD (ex: 26.03.15 pour le 15 mars 2026)
2. NOM EXACT du fournisseur tel qu'il apparaît sur la facture (ex: Guillevin International Co, Bell Canada, United Rentals)
3. NUMÉRO de facture (ex: 8892642, I7501959, 030677, IN001128)
4. CODE CLIENT / COMPTE / PROJET si clairement visible
5. RÉFÉRENCE CLIENT / P.O. / bon de commande si clairement visible
6. Type de document: "invoice" ou "credit"

Réponds UNIQUEMENT en JSON strict, sans texte autour:
{"date":"YY.MM.DD","vendor":"NomFournisseur","invoiceNumber":"XXXXX","customerCode":"","customerReference":"","documentType":"invoice"}

Si une valeur est introuvable, utilise: "" pour vendor/invoiceNumber, "YY.MM.DD" pour date.`;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing AI API key');

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Renders the first page of a PDF buffer to a PNG buffer.
 */
async function pdfToPng(pdfBuffer, scale = 2.0) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale });

  const canvas = createCanvas(vp.width, vp.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport: vp }).promise;

  return canvas.toBuffer('image/png');
}

async function analyzeWithVision(pngBuffer, examples) {
  const client = getClient();
  const base64 = pngBuffer.toString('base64');
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  let prompt = BASE_PROMPT;
  if (examples && examples.length) {
    prompt += "\n\nVoici des exemples de la logique de renommage souhaitée par l'utilisateur (prends-les comme référence absolue):\n";
    examples.forEach(ex => {
      prompt += `- Fichier: ${ex.original} -> Résultat attendu: ${ex.renamed}\n`;
    });
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 250,
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { files } = await request.json();
    const examples = await getLearningExamples();

    const results = await Promise.all(
      files.map(async ({ name, data }) => {
        try {
          const pdfBuffer = Buffer.from(data, 'base64');

          // 1. PDF -> PNG
          const pngBuffer = await pdfToPng(pdfBuffer);
          const preview = pngBuffer.toString('base64');

          // 2. Vision Analysis (with learning examples)
          const extracted = await analyzeWithVision(pngBuffer, examples);
          
          if (!extracted) throw new Error("L'IA n'a retourné aucune donnée.");

          // 3. 2026 Naming
          const vendorName = canonicalizeVendor(extracted.vendor, name, '');
          const naming = build2026Filename({
            date: extracted.date || 'YY.MM.DD',
            vendor: vendorName,
            invoiceNumber: extracted.invoiceNumber || '00000',
            customerCode: extracted.customerCode || '',
            customerReference: extracted.customerReference || '',
            documentType: extracted.documentType || 'invoice',
          });

          return {
            original: name,
            renamed: naming.renamed,
            data,
            preview,
            status: 'ok',
            date: naming.date,
            vendor: naming.vendor,
            invoiceNumber: naming.invoiceNumber,
          };
        } catch (err) {
          console.error(`Error processing ${name}:`, err);
          return { original: name, status: 'error', message: err.message };
        }
      })
    );

    return jsonResponse(results);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
