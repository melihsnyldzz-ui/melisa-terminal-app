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

app.listen(port, () => {
  console.log(`melisa-terminal-price-service listening on port ${port}`);
});
