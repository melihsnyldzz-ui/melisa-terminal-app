const dotenv = require('dotenv');
const sql = require('mssql');

dotenv.config();

const TABLE_KEYWORDS = ['BARKOD', 'BARCODE', 'STOK', 'URUN', 'MAL', 'FIYAT', 'PRICE', 'SATIS'];

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

async function main() {
  if (!isSqlConfigured()) {
    console.error(JSON.stringify({ ok: false, message: 'SQL bağlantı ayarları eksik' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = await sql.connect(sqlConfig);
  const request = pool.request();
  TABLE_KEYWORDS.forEach((keyword, index) => {
    request.input(`keyword${index}`, sql.NVarChar(80), `%${keyword}%`);
  });

  const whereClause = TABLE_KEYWORDS
    .map((_keyword, index) => `UPPER(TABLE_NAME) LIKE @keyword${index}`)
    .join(' OR ');

  const result = await request.query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
      AND (${whereClause})
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);

  console.log(JSON.stringify({
    ok: true,
    mode: 'metadata-only',
    keywords: TABLE_KEYWORDS,
    tables: result.recordset,
  }, null, 2));

  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Tablo keşfi çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
