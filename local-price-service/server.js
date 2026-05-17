const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const sql = require('mssql');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const demoMode = String(process.env.DEMO_MODE || 'true').toLowerCase() !== 'false';

const demoProducts = new Map([
  [
    'MB-1001',
    {
      code: 'MB-1001',
      name: 'Bebek Takım',
      price: 485,
      currency: 'TL',
    },
  ],
]);

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

const vegaSchemaTargets = [
  {
    key: 'saleHeader',
    label: 'Satış fişi başlık tablosu',
    schema: 'dbo',
    table: 'F0102D0007TBLSTKCIKBASLIK',
    importantColumns: ['IND', 'EVRAKNO', 'TARIH', 'CARI', 'CARIKODU', 'GENELTOPLAM'],
  },
  {
    key: 'saleLine',
    label: 'Satış fişi satır tablosu',
    schema: 'dbo',
    table: 'F0102D0007TBLSTKCIKHAREKET',
    importantColumns: ['IND', 'EVRAKNO', 'STOKNO', 'STOKKODU', 'BARKOD', 'MIKTAR', 'FIYAT', 'PB'],
  },
];

let sqlPoolPromise;
let lastSqlStatus = demoMode ? 'demo-mode' : 'not-connected';

function isSqlConfigured() {
  return Boolean(sqlConfig.server && sqlConfig.database && sqlConfig.user && sqlConfig.password);
}

function getSqlPool() {
  if (!isSqlConfigured()) {
    lastSqlStatus = 'missing-config';
    throw new Error('SQL bağlantı ayarları eksik');
  }

  if (!sqlPoolPromise) {
    sqlPoolPromise = sql.connect(sqlConfig);
  }

  return sqlPoolPromise;
}

function getDemoProduct(code) {
  const product = demoProducts.get(code);
  if (!product) {
    return {
      found: false,
      code,
      message: 'Ürün bulunamadı',
    };
  }

  return {
    found: true,
    code: product.code,
    name: product.name,
    price: product.price,
    currency: product.currency,
  };
}

async function getSqlProduct(code) {
  const query = String(process.env.SQL_PRICE_QUERY || '').trim();
  if (!query) {
    lastSqlStatus = 'missing-query';
    return {
      found: false,
      code,
      message: 'SQL_PRICE_QUERY tanımlı değil',
    };
  }

  const pool = await getSqlPool();
  const result = await pool.request().input('code', sql.NVarChar(80), code).query(query);
  lastSqlStatus = 'connected';

  const row = result.recordset && result.recordset[0];
  if (!row) {
    return {
      found: false,
      code,
      message: 'Ürün bulunamadı',
    };
  }

  return {
    found: true,
    code: String(row.code || row.CODE || code),
    name: String(row.name || row.NAME || row.MALINCINSI || row.ACIKLAMA || ''),
    price: Number(row.price || row.PRICE || row.FIYAT || 0),
    currency: String(row.currency || row.CURRENCY || row.PB1 || 'TL'),
  };
}

async function discoverVegaSchema() {
  const pool = await getSqlPool();
  const targets = [];

  for (const target of vegaSchemaTargets) {
    const request = pool.request();
    request.input('schema', sql.NVarChar(128), target.schema);
    request.input('table', sql.NVarChar(128), target.table);
    const result = await request.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `);

    const columns = result.recordset.map((column) => ({
      name: String(column.COLUMN_NAME || ''),
      dataType: String(column.DATA_TYPE || ''),
      nullable: String(column.IS_NULLABLE || '') === 'YES',
      maxLength: column.CHARACTER_MAXIMUM_LENGTH,
      numericPrecision: column.NUMERIC_PRECISION,
      numericScale: column.NUMERIC_SCALE,
    }));
    const upperColumns = new Set(columns.map((column) => column.name.toUpperCase()));
    const importantColumns = target.importantColumns.map((columnName) => ({
      name: columnName,
      exists: upperColumns.has(columnName),
    }));

    targets.push({
      key: target.key,
      label: target.label,
      schema: target.schema,
      table: target.table,
      exists: columns.length > 0,
      importantColumns,
      columnCount: columns.length,
      columns,
    });
  }

  lastSqlStatus = 'connected';
  return targets;
}

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'melisa-terminal-price-service',
    demoMode,
    sql: {
      configured: isSqlConfigured(),
      status: lastSqlStatus,
    },
  });
});

app.get('/product-price', async (request, response) => {
  const code = String(request.query.code || '').trim().toUpperCase();

  if (demoMode) {
    response.json(getDemoProduct(code));
    return;
  }

  try {
    const product = await getSqlProduct(code);
    response.json(product);
  } catch (error) {
    lastSqlStatus = 'error';
    sqlPoolPromise = undefined;
    response.status(503).json({
      found: false,
      code,
      message: 'SQL fiyat sorgusu çalıştırılamadı',
      error: error instanceof Error ? error.message : 'Bilinmeyen SQL hatası',
    });
  }
});

app.get('/api/vega/schema-discovery', async (_request, response) => {
  const safetyMessage = 'Read-only schema discovery. Bu endpoint sadece INFORMATION_SCHEMA okur; INSERT/UPDATE/DELETE çalıştırmaz.';

  if (demoMode || !isSqlConfigured()) {
    response.json({
      ok: false,
      mode: 'read-only',
      message: 'Vega bağlantısı yok. Schema discovery için SQL bağlantı ayarları hazır değil.',
      safetyMessage,
      sql: {
        configured: isSqlConfigured(),
        status: demoMode ? 'demo-mode' : 'missing-config',
      },
      relationshipNote: 'header.IND = line.EVRAKNO',
      targets: vegaSchemaTargets.map((target) => ({
        key: target.key,
        label: target.label,
        schema: target.schema,
        table: target.table,
        exists: false,
        importantColumns: target.importantColumns.map((columnName) => ({ name: columnName, exists: false })),
        columnCount: 0,
        columns: [],
      })),
    });
    return;
  }

  try {
    const targets = await discoverVegaSchema();
    response.json({
      ok: true,
      mode: 'read-only',
      message: 'Vega schema discovery tamamlandı.',
      safetyMessage,
      sql: {
        configured: true,
        status: lastSqlStatus,
      },
      relationshipNote: 'header.IND = line.EVRAKNO',
      targets,
    });
  } catch (error) {
    lastSqlStatus = 'error';
    sqlPoolPromise = undefined;
    response.status(200).json({
      ok: false,
      mode: 'read-only',
      message: 'Vega bağlantısı yok veya schema discovery okunamadı.',
      safetyMessage,
      sql: {
        configured: isSqlConfigured(),
        status: lastSqlStatus,
      },
      relationshipNote: 'header.IND = line.EVRAKNO',
      error: error instanceof Error ? error.message : 'Bilinmeyen SQL hatası',
      targets: vegaSchemaTargets.map((target) => ({
        key: target.key,
        label: target.label,
        schema: target.schema,
        table: target.table,
        exists: false,
        importantColumns: target.importantColumns.map((columnName) => ({ name: columnName, exists: false })),
        columnCount: 0,
        columns: [],
      })),
    });
  }
});

app.listen(port, () => {
  console.log(`melisa-terminal-price-service listening on port ${port}`);
});
