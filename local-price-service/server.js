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

const WRITE_SQL_PATTERN = /\b(insert|update|delete|merge|drop|alter|create|truncate|exec|execute|sp_|xp_)\b/i;

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

function isReadOnlySelectQuery(query) {
  const normalized = String(query || '').trim().replace(/;+\s*$/, '');
  return /^select\b/i.test(normalized) && !WRITE_SQL_PATTERN.test(normalized);
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

function buildUnknownCustomerMatch(customerCode, customerName, reason) {
  return {
    status: 'unknown',
    terminalCustomerCode: customerCode || '',
    terminalCustomerName: customerName || '',
    candidateCustomerCode: '',
    candidateCustomerName: '',
    message: reason,
  };
}

function buildUnknownItemMatch(item, reason) {
  return {
    status: 'unknown',
    barcode: item.barcode || '',
    stockCode: item.stockCode || '',
    productName: item.productName || '',
    candidateStockCode: '',
    candidateStockNo: '',
    candidateProductName: '',
    priceFound: false,
    message: reason,
  };
}

function mapProductRowToMatch(item, row) {
  if (!row) {
    return {
      status: 'notFound',
      barcode: item.barcode || '',
      stockCode: item.stockCode || '',
      productName: item.productName || '',
      candidateStockCode: '',
      candidateStockNo: '',
      candidateProductName: '',
      priceFound: false,
      message: 'Vega stok kaydı bulunamadı.',
    };
  }

  const price = Number(row.price || row.PRICE || row.FIYAT || row.SATISFIYATI || 0);
  return {
    status: 'found',
    barcode: item.barcode || '',
    stockCode: item.stockCode || '',
    productName: item.productName || '',
    candidateStockCode: String(row.code || row.CODE || row.STOKKODU || item.stockCode || item.barcode || ''),
    candidateStockNo: String(row.stockNo || row.STOCKNO || row.STOKNO || row.IND || ''),
    candidateProductName: String(row.name || row.NAME || row.MALINCINSI || row.ACIKLAMA || item.productName || ''),
    priceFound: Number.isFinite(price) && price > 0,
    message: 'Vega stok adayı bulundu.',
  };
}

async function matchCustomerReadOnly(customerCode, customerName) {
  const query = String(process.env.SQL_CUSTOMER_MATCH_QUERY || '').trim();
  if (!query) return buildUnknownCustomerMatch(customerCode, customerName, 'Cari eşleşme sorgusu hazır değil.');
  if (!isReadOnlySelectQuery(query)) return buildUnknownCustomerMatch(customerCode, customerName, 'Cari eşleşme sorgusu read-only değil, çalıştırılmadı.');

  const pool = await getSqlPool();
  const result = await pool.request()
    .input('customerCode', sql.NVarChar(120), customerCode || '')
    .input('customerName', sql.NVarChar(240), customerName || '')
    .query(query);
  const row = result.recordset && result.recordset[0];
  lastSqlStatus = 'connected';

  if (!row) {
    return {
      status: 'notFound',
      terminalCustomerCode: customerCode || '',
      terminalCustomerName: customerName || '',
      candidateCustomerCode: '',
      candidateCustomerName: '',
      message: 'Vega cari kaydı bulunamadı.',
    };
  }

  return {
    status: 'found',
    terminalCustomerCode: customerCode || '',
    terminalCustomerName: customerName || '',
    candidateCustomerCode: String(row.code || row.CODE || row.CARIKODU || row.KOD || customerCode || ''),
    candidateCustomerName: String(row.name || row.NAME || row.CARIADI || row.UNVAN || row.ADI || customerName || ''),
    message: 'Vega cari adayı bulundu.',
  };
}

async function matchItemReadOnly(item) {
  const query = String(process.env.SQL_PRICE_QUERY || '').trim();
  if (!query) return buildUnknownItemMatch(item, 'Stok/fiyat sorgusu hazır değil.');
  if (!isReadOnlySelectQuery(query)) return buildUnknownItemMatch(item, 'Stok/fiyat sorgusu read-only değil, çalıştırılmadı.');

  const code = String(item.barcode || item.stockCode || '').trim().toUpperCase();
  if (!code) return buildUnknownItemMatch(item, 'Barkod veya stok kodu yok.');

  const pool = await getSqlPool();
  const result = await pool.request().input('code', sql.NVarChar(80), code).query(query);
  lastSqlStatus = 'connected';
  return mapProductRowToMatch(item, result.recordset && result.recordset[0]);
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

app.post('/api/vega/match-check', async (request, response) => {
  const safetyMessage = 'Read-only Vega match check. Bu endpoint sadece SELECT çalıştırır; INSERT/UPDATE/DELETE çalıştırmaz.';
  const body = request.body || {};
  const customerCode = String(body.customerCode || '').trim();
  const customerName = String(body.customerName || '').trim();
  const items = Array.isArray(body.items) ? body.items.slice(0, 100).map((item) => ({
    barcode: String(item.barcode || '').trim().toUpperCase(),
    stockCode: String(item.stockCode || '').trim().toUpperCase(),
    productName: String(item.productName || '').trim(),
  })) : [];

  if (demoMode || !isSqlConfigured()) {
    response.json({
      ok: false,
      mode: 'read-only',
      message: 'Vega bağlantısı yok. Cari/stok eşleşme için SQL bağlantı ayarları hazır değil.',
      safetyMessage,
      sql: {
        configured: isSqlConfigured(),
        status: demoMode ? 'demo-mode' : 'missing-config',
      },
      customerMatch: buildUnknownCustomerMatch(customerCode, customerName, 'Vega bağlantısı yok.'),
      itemMatches: items.map((item) => buildUnknownItemMatch(item, 'Vega bağlantısı yok.')),
    });
    return;
  }

  try {
    const [customerMatch, itemMatches] = await Promise.all([
      matchCustomerReadOnly(customerCode, customerName),
      Promise.all(items.map(matchItemReadOnly)),
    ]);

    response.json({
      ok: true,
      mode: 'read-only',
      message: 'Vega cari/stok eşleşme kontrolü tamamlandı.',
      safetyMessage,
      sql: {
        configured: true,
        status: lastSqlStatus,
      },
      customerMatch,
      itemMatches,
    });
  } catch (error) {
    lastSqlStatus = 'error';
    sqlPoolPromise = undefined;
    response.status(200).json({
      ok: false,
      mode: 'read-only',
      message: 'Vega bağlantısı yok veya cari/stok eşleşme okunamadı.',
      safetyMessage,
      sql: {
        configured: isSqlConfigured(),
        status: lastSqlStatus,
      },
      customerMatch: buildUnknownCustomerMatch(customerCode, customerName, 'Eşleşme kontrolü okunamadı.'),
      itemMatches: items.map((item) => buildUnknownItemMatch(item, 'Eşleşme kontrolü okunamadı.')),
      reason: 'SQL okuma sırasında hata oluştu. Credential veya gizli bilgi response içinde paylaşılmaz.',
    });
  }
});

app.listen(port, () => {
  console.log(`melisa-terminal-price-service listening on port ${port}`);
});
