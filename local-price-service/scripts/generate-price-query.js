const fs = require('fs/promises');
const path = require('path');

const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');
const candidatesPath = path.join(reportsDir, 'price-query-candidates.json');

function bracketEscape(value) {
  return `[${String(value || '').replace(/]/g, ']]')}]`;
}

function splitTableName(value) {
  const parts = String(value || '').split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) return { schema: null, table: parts[0] };
  if (parts.length === 2) return { schema: parts[0], table: parts[1] };
  return null;
}

function quoteTableName(value) {
  const tableName = splitTableName(value);
  if (!tableName || !tableName.table) return null;
  if (!tableName.schema) return bracketEscape(tableName.table);
  return `${bracketEscape(tableName.schema)}.${bracketEscape(tableName.table)}`;
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return 'Aday kayıt bulunamadı';
  if (!candidate.table) return 'Aday table alanı eksik';
  if (!candidate.barcodeColumn) return 'Aday barcodeColumn alanı eksik';
  if (!candidate.nameColumn) return 'Aday nameColumn alanı eksik';
  if (!candidate.priceColumn) return 'Aday priceColumn alanı eksik';
  if (!quoteTableName(candidate.table)) return 'Aday table formatı geçersiz';
  return null;
}

function buildSqlPriceQuery(candidate) {
  const tableName = quoteTableName(candidate.table);
  const barcodeColumn = bracketEscape(candidate.barcodeColumn);
  const nameColumn = bracketEscape(candidate.nameColumn);
  const priceColumn = bracketEscape(candidate.priceColumn);

  return [
    'SELECT TOP (1)',
    `  CAST(${barcodeColumn} AS nvarchar(80)) AS code,`,
    `  CAST(${nameColumn} AS nvarchar(255)) AS name,`,
    `  CAST(${priceColumn} AS decimal(18, 2)) AS price`,
    `FROM ${tableName}`,
    `WHERE ${barcodeColumn} = @code`,
  ].join('\n');
}

async function readCandidates() {
  const content = await fs.readFile(candidatesPath, 'utf8');
  const report = JSON.parse(content);
  return Array.isArray(report.candidates) ? report.candidates : [];
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'generated-price-query.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const candidates = await readCandidates();
  const candidate = candidates[0];
  const validationError = validateCandidate(candidate);

  if (validationError) {
    const payload = {
      ok: false,
      message: validationError,
      candidate: candidate || null,
    };
    await saveReport(payload);
    console.log(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  const payload = {
    ok: true,
    candidate,
    sqlPriceQuery: buildSqlPriceQuery(candidate),
  };

  await saveReport(payload);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Fiyat sorgusu önerisi üretilemedi',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
