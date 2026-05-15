# Vega Price Marker Search v4.2.0

## Amaç

Vega ekranında test ürününün `1. Satış Fiyatı` alanına yazılan ayırt edici fiyat değerinin SQL Server içinde hangi tablo ve kolonda tutulduğunu read-only olarak bulmak.

## Test Verisi

- Barkod: `0000051461011`
- Numeric marker: `123456789`
- Vega ekranındaki değer: `123.456.789,00 TL`

## Script

```powershell
cd local-price-service
node scripts/find-price-marker-value.js
node scripts/find-price-marker-value.js --save
```

Script `.env` içinden şu değerleri okur:

```env
PRICE_MARKER_VALUE=123456789
SQL_TEST_BARCODE=0000051461011
```

## Güvenlik

- Sadece `INFORMATION_SCHEMA.COLUMNS` metadata okur.
- Sadece numeric kolonlarda parametreli `SELECT` çalıştırır.
- Tablo ve kolon adları metadata’dan gelir ve bracket escape uygulanır.
- `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`, `MERGE`, `EXEC` komutları kullanılmaz.
- `.env`, SQL şifresi veya credential bilgisi rapora yazılmaz.

## Rapor

`--save` kullanılırsa çıktı şuraya yazılır:

```text
local-price-service/reports/find-price-marker-value.json
```

Rapor eşleşme bulunursa tablo, kolon, veri tipi, eşleşen satır sayısı ve aynı satırdaki yardımcı kolonları içerir.
