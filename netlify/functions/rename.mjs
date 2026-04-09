import pdf from 'pdf-parse/lib/pdf-parse.js';
import OpenAI from 'openai';

const PREFIX = 'DR';

const PROMPT = `Tu analyses le texte brut extrait d'une facture commerciale québécoise.
Extrais précisément:
1. DATE de la facture au format YY.MM.DD (ex: 26.04.01 pour le 1er avril 2026)
2. NOM du fournisseur/vendeur (ex: Guillevin International Co, Bell, United Rentals)
3. NUMÉRO de facture (chiffres seulement, ex: 8892642)

Réponds UNIQUEMENT en JSON strict:
{"date":"YY.MM.DD","vendor":"NomFournisseur","invoiceNumber":"XXXXX"}

Si une valeur est introuvable: "" pour vendor/invoiceNumber, "YY.MM.DD" pour date.`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractMetadata(text) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1',
    messages: [
      { role: 'user', content: `${PROMPT}\n\nTexte de la facture:\n${text.slice(0, 4000)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });
  return JSON.parse(response.choices[0].message.content);
}

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { files } = JSON.parse(event.body);

    const results = await Promise.all(
      files.map(async ({ name, data }) => {
        try {
          const buffer = Buffer.from(data, 'base64');
          const parsed = await pdf(buffer);
          const { date, vendor, invoiceNumber } = await extractMetadata(parsed.text);

          const dateStr      = date || 'YY.MM.DD';
          const vendorName   = vendor || 'FournisseurInconnu';
          const invNum       = invoiceNumber || '00000';
          const renamed      = `${dateStr} - ${PREFIX} - ${invNum} - ${vendorName}.pdf`;

          return { original: name, renamed, data, status: 'ok', date: dateStr, vendor: vendorName, invoiceNumber: invNum };
        } catch (err) {
          return { original: name, status: 'error', message: err.message };
        }
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
