const { processInvoices } = require('./src/processor');

processInvoices().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
