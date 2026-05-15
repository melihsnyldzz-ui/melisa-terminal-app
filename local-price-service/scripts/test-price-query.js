const dotenv = require('dotenv');
const sql = require('mssql');

dotenv.config();

const BLOCKED_SQL_WORDS = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|MERGE|EXEC|GRANT|DENY|REVOKE)\b/i;

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
  if (!trimmed) return 'SQL_PRICE_QUERY tanımlı değil';
  if (!/^SELECT\b/i.test(trimmed)) return 'SQL_PRICE_QUERY sadece SELECT ile başlamalı';
  if (BLOCKED_SQL_WORDS.test(trimmed)) return 'SQL_PRICE_QUERY içinde yazma/yönetim komutu bulunmamalı';
  if (!trimmed.includes('@code')) return 'SQL_PRICE_QUERY @code parametresini kullanmalı';
  return null;
}

async function main() {
  const query = String(process.env.SQL_PRICE_QUERY || '').trim();
  const code = String(process.env.SQL_TEST_BARCODE || 'MB-1001').trim().toUpperCase();
  const validationError = validateReadOnlyQuery(query);

  if (validationError) {
    console.error(JSON.stringify({ ok: false, found: false, code, message: validationError }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!isSqlConfigured()) {
    console.error(JSON.stringify({ ok: false, found: false, code, message: 'SQL bağlantı ayarları eksik' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().input('code', sql.NVarChar(80), code).query(query);

  console.log(JSON.stringify({
    ok: true,
    mode: 'read-only-test',
    code,
    rows: result.recordset,
  }, null, 2));

  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Fiyat sorgusu testi çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
