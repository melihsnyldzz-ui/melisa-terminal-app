const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const sql = require('mssql');

dotenv.config();

const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');
const PRICE_FIELD_PATTERN = /(SATIS|FIYAT|PRICE|TUTAR|PB\d*|APB|DAPB)/i;

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

function pickPriceFields(row) {
  return Object.entries(row || {}).reduce((fields, [key, value]) => {
    if (PRICE_FIELD_PATTERN.test(key)) {
      fields[key] = value;
    }
    return fields;
  }, {});
}

function pickNonZeroNumericFields(fields) {
  return Object.entries(fields).reduce((result, [key, value]) => {
    const numeric = Number(value);
    if (typeof value === 'number' && Number.isFinite(numeric) && numeric !== 0) {
      result[key] = value;
    }
    return result;
  }, {});
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'test-stock-price-fields.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const code = String(process.env.SQL_TEST_BARCODE || '').trim().toUpperCase();
  if (!code) {
    const payload = { ok: false, message: 'SQL_TEST_BARCODE tanimli degil' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!isSqlConfigured()) {
    const payload = { ok: false, code, message: 'SQL baglanti ayarlari eksik' };
    await saveReport(payload);
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = await sql.connect(sqlConfig);
  const barcodeResult = await pool.request()
    .input('code', sql.NVarChar(80), code)
    .query(`
      SELECT TOP (1)
        BARCODE,
        STOKNO
      FROM F0102TBLBIRIMLEREX
      WHERE BARCODE = @code
    `);

  const barcodeRow = barcodeResult.recordset && barcodeResult.recordset[0];
  if (!barcodeRow) {
    const payload = { ok: true, found: false, code, message: 'Barkod bulunamadi' };
    await saveReport(payload);
    console.log(JSON.stringify(payload, null, 2));
    await pool.close();
    return;
  }

  const stockResult = await pool.request()
    .input('stokno', sql.Int, barcodeRow.STOKNO)
    .query(`
      SELECT TOP (1) *
      FROM F0102TBLSTOKLAR
      WHERE IND = @stokno
    `);

  const stockRow = stockResult.recordset && stockResult.recordset[0];
  const priceFields = pickPriceFields(stockRow);
  const nonZeroPriceFields = pickNonZeroNumericFields(priceFields);

  const payload = {
    ok: true,
    found: Boolean(stockRow),
    barcode: code,
    stokno: barcodeRow.STOKNO,
    name: stockRow ? stockRow.MALINCINSI : null,
    stokKodu: stockRow ? stockRow.STOKKODU : null,
    priceFields,
    nonZeroPriceFields,
    currencyFields: {
      APB: priceFields.APB ?? null,
      DAPB: priceFields.DAPB ?? null,
      PB1: priceFields.PB1 ?? null,
      PB2: priceFields.PB2 ?? null,
      PB3: priceFields.PB3 ?? null,
    },
  };

  await saveReport(payload);
  console.log(JSON.stringify(payload, null, 2));
  await pool.close();
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Stok fiyat alanlari testi calistirilamadi',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
