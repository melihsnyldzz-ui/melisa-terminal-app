const dotenv = require('dotenv');
const sql = require('mssql');

dotenv.config();

const COLUMN_KEYWORDS = ['BARKOD', 'BARCODE', 'STOK', 'KOD', 'AD', 'ACIKLAMA', 'FIYAT', 'PRICE', 'SATIS'];

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

function parseTableName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_ğĞüÜşŞıİöÖçÇ.]+$/.test(trimmed)) return null;

  const parts = trimmed.split('.');
  if (parts.length === 1) {
    return { schema: null, table: parts[0] };
  }
  if (parts.length === 2) {
    return { schema: parts[0], table: parts[1] };
  }
  return null;
}

function isHighlighted(columnName) {
  const upper = String(columnName || '').toUpperCase();
  return COLUMN_KEYWORDS.some((keyword) => upper.includes(keyword));
}

async function main() {
  const target = parseTableName(process.argv[2]);
  if (!target) {
    console.error(JSON.stringify({ ok: false, message: 'Kullanım: node scripts/discover-columns.js TABLO_ADI' }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!isSqlConfigured()) {
    console.error(JSON.stringify({ ok: false, message: 'SQL bağlantı ayarları eksik' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = await sql.connect(sqlConfig);
  const request = pool.request().input('table', sql.NVarChar(256), target.table);
  let schemaFilter = '';
  if (target.schema) {
    request.input('schema', sql.NVarChar(256), target.schema);
    schemaFilter = 'AND TABLE_SCHEMA = @schema';
  }

  const result = await request.query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = @table
      ${schemaFilter}
    ORDER BY ORDINAL_POSITION
  `);

  const columns = result.recordset.map((column) => ({
    ...column,
    highlighted: isHighlighted(column.COLUMN_NAME),
  }));

  console.log(JSON.stringify({
    ok: true,
    mode: 'metadata-only',
    table: target.schema ? `${target.schema}.${target.table}` : target.table,
    highlightKeywords: COLUMN_KEYWORDS,
    columns,
  }, null, 2));

  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Kolon keşfi çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
