const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');

dotenv.config();

const BLOCKED_SQL_WORDS = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|MERGE|EXEC|GRANT|DENY|REVOKE)\b/i;
const reportsDir = path.resolve(__dirname, '..', 'reports');
const candidatesPath = path.join(reportsDir, 'price-query-candidates.json');
const generatedQueryPath = path.join(reportsDir, 'generated-price-query.json');
const pipelineResultPath = path.join(reportsDir, 'price-lookup-pipeline-result.json');

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

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function saveResult(payload) {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(pipelineResultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function fail(message) {
  const payload = { ok: false, message };
  await saveResult(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
}

async function readGeneratedQuery() {
  const content = await fs.readFile(generatedQueryPath, 'utf8');
  const report = JSON.parse(content);
  return String(report.sqlPriceQuery || '').trim();
}

async function main() {
  if (!(await fileExists(reportsDir))) {
    await fail('reports klasörü bulunamadı');
    return;
  }

  if (!(await fileExists(candidatesPath))) {
    await fail('price-query-candidates.json bulunamadı');
    return;
  }

  if (!(await fileExists(generatedQueryPath))) {
    await fail('generated-price-query.json bulunamadı');
    return;
  }

  const code = String(process.env.SQL_TEST_BARCODE || '').trim().toUpperCase();
  if (!code) {
    await fail('SQL_TEST_BARCODE tanımlı değil');
    return;
  }

  if (!isSqlConfigured()) {
    await fail('SQL bağlantı ayarları eksik');
    return;
  }

  const query = await readGeneratedQuery();
  const validationError = validateReadOnlyQuery(query);
  if (validationError) {
    await fail(validationError);
    return;
  }

  const sql = require('mssql');
  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().input('code', sql.NVarChar(80), code).query(query);

  const payload = {
    ok: true,
    code,
    rows: result.recordset,
  };

  await saveResult(payload);
  console.log(JSON.stringify(payload, null, 2));
  await pool.close();
}

main().catch(async (error) => {
  const payload = {
    ok: false,
    message: 'Price lookup pipeline çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  };
  await saveResult(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
