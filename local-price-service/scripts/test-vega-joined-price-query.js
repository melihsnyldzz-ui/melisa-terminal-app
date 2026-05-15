const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const sql = require('mssql');

dotenv.config();

const BLOCKED_SQL_WORDS = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|MERGE|EXEC|GRANT|DENY|REVOKE)\b/i;
const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');

const query = `
SELECT TOP (1)
  CAST(b.BARCODE AS nvarchar(80)) AS code,
  CAST(s.MALINCINSI AS nvarchar(255)) AS name,
  CAST(b.SATISFIYATI AS decimal(18, 2)) AS price
FROM F0102TBLBIRIMLEREX b
LEFT JOIN F0102TBLSTOKLAR s
  ON b.STOKNO = s.IND
WHERE b.BARCODE = @code
`;

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

function validateReadOnlyQuery(sqlQuery) {
  const trimmed = String(sqlQuery || '').trim();
  if (!trimmed) return 'Joined Vega sorgusu tanımlı değil';
  if (!/^SELECT\b/i.test(trimmed)) return 'Joined Vega sorgusu sadece SELECT ile başlamalı';
  if (BLOCKED_SQL_WORDS.test(trimmed)) return 'Joined Vega sorgusu içinde yazma/yönetim komutu bulunmamalı';
  if (!trimmed.includes('@code')) return 'Joined Vega sorgusu @code parametresini kullanmalı';
  return null;
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'test-vega-joined-price-query.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const code = String(process.env.SQL_TEST_BARCODE || '').trim().toUpperCase();
  if (!code) {
    const payload = { ok: false, message: 'SQL_TEST_BARCODE tanımlı değil' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

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
  const row = result.recordset && result.recordset[0];

  const payload = {
    ok: true,
    code,
    rows: result.recordset,
    summary: {
      found: Boolean(row),
      barcode: row ? row.code : code,
      name: row ? row.name : null,
      price: row ? row.price : null,
      isPriceZero: row ? Number(row.price) === 0 : null,
      isNameEmpty: row ? !String(row.name || '').trim() : null,
    },
  };

  await saveReport(payload);
  console.log(JSON.stringify(payload, null, 2));
  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Joined Vega fiyat sorgusu çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
