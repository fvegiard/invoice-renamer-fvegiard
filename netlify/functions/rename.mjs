import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';
import { pathToFileURL } from 'url';

const functionDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(functionDir, '../../src');
const [{ canonicalizeVendor }, { build2026Filename }] = await Promise.all([
  import(pathToFileURL(path.join(srcDir, 'reference.js')).href),
  import(pathToFileURL(path.join(srcDir, 'naming.js')).href),
]);

const PROMPT = `Tu analyses un PDF de facture commerciale québécoise.
Extrais précisément:
1. DATE de la facture au format YY.MM.DD (ex: 26.04.01 pour le 1er avril 2026)
2. NOM du fournisseur/vendeur tel qu'il apparaît sur la facture
3. NUMÉRO de facture principal
4. CODE CLIENT / COMPTE / PROJET si clairement visible
5. RÉFÉRENCE CLIENT / P.O. / bon de commande si clairement visible
6. Type de document: "invoice" ou "credit"

Réponds UNIQUEMENT en JSON strict:
{"date":"YY.MM.DD","vendor":"NomFournisseur","invoiceNumber":"XXXXX","customerCode":"","customerReference":"","documentType":"invoice"}

Si une valeur est introuvable: "" pour les champs texte, "YY.MM.DD" pour date.`;

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

function normalizeResult(raw) {
  return {
    date: raw.date || raw.invoiceDate || 'YY.MM.DD',
    vendor: raw.vendor || raw.supplier || raw.vendorName || '',
    invoiceNumber: raw.invoiceNumber || raw.invoice_number || raw.number || '00000',
    customerCode: raw.customerCode || raw.customer_code || raw.account || raw.client || '',
    customerReference: raw.customerReference || raw.customer_reference || raw.purchaseOrder || raw.poNumber || '',
    documentType: raw.documentType || raw.document_type || 'invoice',
  };
}

function getCandidateModels() {
  return [...new Set([
    process.env.OPENAI_MODEL,
    'openai/gpt-4o',
    
    'gpt-4o',
  ].filter(Boolean))];
}

function isRetryableModelRoutingError(error) {
  const message = String(error?.message || '');
  return message.includes('unable to find suitable provider');
}

async function extractMetadataWithModel(client, pdfBase64, model) {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          {
            type: 'file',
            file: {
              filename: 'invoice.pdf',
              file_data: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  return normalizeResult(JSON.parse(response.choices[0].message.content));
}

async function extractMetadata(pdfBase64) {
  const client = getClient();
  let lastError = null;

  for (const model of getCandidateModels()) {
    try {
      return await extractMetadataWithModel(client, pdfBase64, model);
    } catch (error) {
      lastError = error;
      if (!isRetryableModelRoutingError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('No usable AI model available');
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { files } = await request.json();

    const results = await Promise.all(
      files.map(async ({ name, data }) => {
        try {
          const extracted = await extractMetadata(data);
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
            status: 'ok',
            date: naming.date,
            vendor: naming.vendor,
            invoiceNumber: naming.invoiceNumber,
          };
        } catch (err) {
          return { original: name, status: 'error', message: err.message };
        }
      })
    );

    return jsonResponse(results);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
