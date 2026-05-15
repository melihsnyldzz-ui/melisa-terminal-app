const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const sql = require('mssql');

dotenv.config();

const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');
const outputPath = path.join(reportsDir, 'find-price-marker-value.json');

const NUMERIC_TYPES = [
  'decimal',
  'numeric',
  'money',
  'smallmoney',
  'float',
  'real',
  'int',
  'bigint',
];

const PRIORITY_TERMS = ['FIYAT', 'SATIS', 'PRICE', 'TUTAR', 'LISTE', 'TARIFE', 'STOK', 'BIRIM'];
const USEFUL_COLUMNS = [
  'IND',
  'STOKNO',
  'STOKKODU',
  'KOD',
  'BARCODE',
  'BARKOD',
  'ACIKLAMA',
  'MALINCINSI',
  'PB',
  'PB1',
  'DOVIZ',
];
const BLOCKED_SQL_PATTERN = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|MERGE|EXEC|CREATE|GRANT|DENY|REVOKE)\b/i;
const scanAllNumericColumns = String(process.env.PRICE_MARKER_SCAN_ALL || 'false').toLowerCase() === 'true';

const sqlConfig = {
  server: process.env.SQL_SERVER || '',
  database: process.env.SQL_DATABASE || '',
  user: process.env.SQL_USER || '',
  password: process.env.SQL_PASSWORD || '',
  port: Number(process.env.SQL_PORT || 1433),
  requestTimeout: 30000,
  options: {
    encrypt: String(process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQL_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true',
  },
};

function isSqlConfigured() {
  return Boolean(sqlConfig.server && sqlConfig.database && sqlConfig.user && sqlConfig.password);
}

function bracket(identifier) {
  return `[${String(identifier).replace(/]/g, ']]')}]`;
}

function scoreCandidate(tableName, columnName) {
  const target = `${tableName} ${columnName}`.toUpperCase();
  return PRIORITY_TERMS.reduce((score, term) => score + (target.includes(term) ? 10 : 0), 0);
}

function isPriorityCandidate(candidate) {
  return scanAllNumericColumns || candidate.score > 0;
}

function assertReadOnlySelect(query) {
  const normalized = query.trim();
  if (!/^SELECT\b/i.test(normalized)) {
    throw new Error('Sadece SELECT sorgusu calistirilabilir');
  }
  if (BLOCKED_SQL_PATTERN.test(normalized)) {
    throw new Error('Yazma veya yonetim komutu engellendi');
  }
  if (!normalized.includes('@marker')) {
    throw new Error('@marker parametresi zorunludur');
  }
}

function parseMarkerValue() {
  const rawMarker = String(process.env.PRICE_MARKER_VALUE || '').trim();
  if (!rawMarker) {
    return { ok: false, message: 'PRICE_MARKER_VALUE tanimli degil' };
  }

  const marker = Number(rawMarker.replace(',', '.'));
  if (!Number.isFinite(marker)) {
    return { ok: false, message: 'PRICE_MARKER_VALUE numeric degil', rawMarker };
  }

  return { ok: true, rawMarker, marker };
}

function normalizeRow(row) {
  return Object.entries(row || {}).reduce((result, [key, value]) => {
    if (key !== '__matchCount') {
      result[key] = value;
    }
    return result;
  }, {});
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function getNumericColumns(pool) {
  const request = pool.request();
  request.timeout = 30000;
  const result = await request
    .query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE DATA_TYPE IN (
        'decimal',
        'numeric',
        'money',
        'smallmoney',
        'float',
        'real',
        'int',
        'bigint'
      )
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);

  return (result.recordset || [])
    .map((column) => ({
      schema: column.TABLE_SCHEMA,
      table: column.TABLE_NAME,
      column: column.COLUMN_NAME,
      dataType: column.DATA_TYPE,
      score: scoreCandidate(column.TABLE_NAME, column.COLUMN_NAME),
    }))
    .filter(isPriorityCandidate)
    .sort((a, b) => b.score - a.score || a.table.localeCompare(b.table) || a.column.localeCompare(b.column));
}

async function getUsefulColumnsByTable(pool, candidates) {
  const tableNames = [...new Set(candidates.map((candidate) => `${candidate.schema}.${candidate.table}`))];
  if (tableNames.length === 0) return new Map();

  const request = pool.request();
  request.timeout = 30000;
  const result = await request.query(`
    SELECT
      TABLE_SCHEMA,
      TABLE_NAME,
      COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE UPPER(COLUMN_NAME) IN (
      'IND',
      'STOKNO',
      'STOKKODU',
      'KOD',
      'BARCODE',
      'BARKOD',
      'ACIKLAMA',
      'MALINCINSI',
      'PB',
      'PB1',
      'DOVIZ'
    )
  `);

  return (result.recordset || []).reduce((map, column) => {
    const key = `${column.TABLE_SCHEMA}.${column.TABLE_NAME}`;
    const existing = map.get(key) || [];
    if (USEFUL_COLUMNS.includes(String(column.COLUMN_NAME).toUpperCase())) {
      existing.push(column.COLUMN_NAME);
    }
    map.set(key, existing);
    return map;
  }, new Map());
}

async function searchCandidate(pool, candidate, marker, usefulColumnsByTable) {
  const tableKey = `${candidate.schema}.${candidate.table}`;
  const usefulColumns = usefulColumnsByTable.get(tableKey) || [];
  const selectedColumns = [...new Set([candidate.column, ...usefulColumns])];
  const selectList = selectedColumns.map((column) => `${bracket(column)}`).join(',\n        ');
  const query = `
    SELECT TOP (20)
        COUNT_BIG(1) OVER() AS __matchCount,
        ${selectList}
    FROM ${bracket(candidate.schema)}.${bracket(candidate.table)}
    WHERE ${bracket(candidate.column)} = @marker
  `;

  assertReadOnlySelect(query);

  const request = pool.request();
  request.timeout = 5000;
  const result = await request
    .input('marker', sql.Decimal(19, 4), marker)
    .query(query);

  const rows = result.recordset || [];
  if (rows.length === 0) return null;

  return {
    table: `${candidate.schema}.${candidate.table}`,
    column: candidate.column,
    dataType: candidate.dataType,
    score: candidate.score,
    matchedRowCount: Number(rows[0].__matchCount || rows.length),
    sampleRows: rows.map(normalizeRow),
  };
}

async function main() {
  const markerParse = parseMarkerValue();
  const code = String(process.env.SQL_TEST_BARCODE || '').trim();

  if (!markerParse.ok) {
    const payload = { ok: false, message: markerParse.message };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!code) {
    const payload = { ok: false, message: 'SQL_TEST_BARCODE tanimli degil' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!isSqlConfigured()) {
    const payload = { ok: false, code, marker: markerParse.rawMarker, message: 'SQL baglanti ayarlari eksik' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  const matches = [];
  let scannedColumnCount = 0;
  let failedColumnCount = 0;

  const pool = await sql.connect(sqlConfig);

  try {
    const candidates = await getNumericColumns(pool);
    const usefulColumnsByTable = await getUsefulColumnsByTable(pool, candidates);

    for (const candidate of candidates) {
      scannedColumnCount += 1;
      try {
        const match = await searchCandidate(pool, candidate, markerParse.marker, usefulColumnsByTable);
        if (match) {
          matches.push(match);
        }
      } catch (error) {
        failedColumnCount += 1;
      }
    }

    const payload = {
      ok: true,
      marker: markerParse.marker,
      barcode: code,
      scanMode: scanAllNumericColumns ? 'all-numeric-columns' : 'priority-numeric-columns',
      scannedColumnCount,
      failedColumnCount,
      matchCount: matches.length,
      matches,
    };

    await saveReport(payload);
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Fiyat marker aramasi calistirilamadi',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
