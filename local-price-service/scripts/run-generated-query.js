const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const sql = require('mssql');

dotenv.config();

const BLOCKED_SQL_WORDS = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|MERGE|EXEC|GRANT|DENY|REVOKE)\b/i;
const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');
const generatedQueryPath = path.join(reportsDir, 'generated-price-query.json');

const sqlConfig = {
  server: process.env.SQL_SERVER || '',
  database: process.env.SQL_DATABASE || '',
  user: process.env.SQL_USER || '',
  password: process.env.SQL_PASSWORD || '',
  port: Number(process.env.SQL_PORT || 1433),
  options: {
    encrypt: String(process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQL_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true',
  },
};

function isSqlConfigured() {
  return Boolean(sqlConfig.server && sqlConfig.database && sqlConfig.user && sqlConfig.password);
}

function validateReadOnlyQuery(query) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return 'generated-price-query.json içinde sqlPriceQuery tanımlı değil';
  if (!/^SELECT\b/i.test(trimmed)) return 'Generated query sadece SELECT ile başlamalı';
  if (BLOCKED_SQL_WORDS.test(trimmed)) return 'Generated query içinde yazma/yönetim komutu bulunmamalı';
  if (!trimmed.includes('@code')) return 'Generated query @code parametresini kullanmalı';
  return null;
}

async function readGeneratedQuery() {
  const content = await fs.readFile(generatedQueryPath, 'utf8');
  const report = JSON.parse(content);
  return String(report.sqlPriceQuery || '').trim();
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'run-generated-query-result.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const code = String(process.env.SQL_TEST_BARCODE || 'MB-1001').trim().toUpperCase();
  const query = await readGeneratedQuery();
  const validationError = validateReadOnlyQuery(query);

  if (validationError) {
    const payload = { ok: false, code, message: validationError };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!isSqlConfigured()) {
    const payload = { ok: false, code, message: 'SQL bağlantı ayarları eksik' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().input('code', sql.NVarChar(80), code).query(query);

  const payload = {
    ok: true,
    code,
    rows: result.recordset,
  };

  await saveReport(payload);
  console.log(JSON.stringify(payload, null, 2));

  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Generated SQL sorgusu çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
