const { PDFParse } = require('pdf-parse');

async function extractPdfText(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {});
    }
  }
}

module.exports = { extractPdfText };
