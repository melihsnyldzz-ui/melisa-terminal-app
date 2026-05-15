const fs = require('fs/promises');
const path = require('path');

const shouldSaveReport = process.argv.includes('--save');
const reportsDir = path.resolve(__dirname, '..', 'reports');

const SCORE_RULES = {
  barcodeColumn: [
    ['BARKOD', 40],
    ['BARCODE', 40],
    ['STOKKOD', 28],
    ['STOK_KODU', 28],
    ['KOD', 18],
  ],
  nameColumn: [
    ['MALINCINSI', 36],
    ['STOK_ADI', 34],
    ['URUN_ADI', 34],
    ['ACIKLAMA', 30],
    ['ADI', 22],
    ['AD', 14],
  ],
  priceColumn: [
    ['SATISFIYATI', 42],
    ['SATIS_FIYATI', 42],
    ['FIYAT', 35],
    ['SATIS', 28],
    ['PRICE', 35],
    ['TUTAR', 20],
  ],
};

function normalizeName(value) {
  return String(value || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
}

function scoreColumn(columnName, rules) {
  const normalized = normalizeName(columnName).replace(/[^A-Z0-9ĞÜŞİÖÇ_]/g, '');
  return rules.reduce((best, [keyword, score]) => {
    if (normalized === keyword) return Math.max(best, score + 10);
    if (normalized.includes(keyword)) return Math.max(best, score);
    return best;
  }, 0);
}

function findBestColumn(columns, rules) {
  return columns.reduce(
    (best, column) => {
      const columnName = column.COLUMN_NAME || column.columnName || column.name || '';
      const score = scoreColumn(columnName, rules);
      if (score > best.score) {
        return { name: columnName, score };
      }
      return best;
    },
    { name: null, score: 0 },
  );
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readColumnReports() {
  const entries = await fs.readdir(reportsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^discovered-columns-.+\.json$/i.test(entry.name))
    .map((entry) => path.join(reportsDir, entry.name));

  const reports = [];
  for (const file of files) {
    const report = await readJsonFile(file);
    if (report.ok && Array.isArray(report.columns)) {
      reports.push(report);
    }
  }
  return reports;
}

async function readTableReport() {
  const filePath = path.join(reportsDir, 'discovered-tables.json');
  try {
    const report = await readJsonFile(filePath);
    return Array.isArray(report.tables) ? report.tables : [];
  } catch {
    return [];
  }
}

function toTableName(report) {
  if (report.table) return report.table;
  const firstColumn = report.columns && report.columns[0];
  if (!firstColumn) return 'unknown';
  return `${firstColumn.TABLE_SCHEMA}.${firstColumn.TABLE_NAME}`;
}

function analyzeReport(report, knownTables) {
  const columns = Array.isArray(report.columns) ? report.columns : [];
  const barcode = findBestColumn(columns, SCORE_RULES.barcodeColumn);
  const name = findBestColumn(columns, SCORE_RULES.nameColumn);
  const price = findBestColumn(columns, SCORE_RULES.priceColumn);
  const table = toTableName(report);
  const hasTableHint = knownTables.some((knownTable) => {
    const knownName = `${knownTable.TABLE_SCHEMA}.${knownTable.TABLE_NAME}`;
    return knownName.toLocaleUpperCase('tr-TR') === table.toLocaleUpperCase('tr-TR');
  });

  return {
    table,
    score: barcode.score + name.score + price.score + (hasTableHint ? 5 : 0),
    barcodeColumn: barcode.name,
    nameColumn: name.name,
    priceColumn: price.name,
  };
}

async function saveReport(payload) {
  if (!shouldSaveReport) return;
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'price-query-candidates.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const knownTables = await readTableReport();
  const columnReports = await readColumnReports();

  if (columnReports.length === 0) {
    const payload = {
      ok: false,
      message: 'discovered-columns-*.json raporu bulunamadı',
      candidates: [],
    };
    await saveReport(payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const candidates = columnReports
    .map((report) => analyzeReport(report, knownTables))
    .filter((candidate) => candidate.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);

  const payload = {
    ok: true,
    candidates,
  };

  await saveReport(payload);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: 'Discovery rapor analizi çalıştırılamadı',
    error: error instanceof Error ? error.message : 'Bilinmeyen hata',
  }, null, 2));
  process.exitCode = 1;
});
