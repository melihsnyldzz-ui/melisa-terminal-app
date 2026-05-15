# Melisa Terminal Local Price Service

Windows bilgisayarda terminal uygulamasına fiyat cevabı vermek için hazırlanmış Express servis iskeletidir.

## Kurulum

```powershell
cd local-price-service
npm install
npm start
```

Varsayılan port `.env` üzerinden ayarlanır:

```env
PORT=8787
DEMO_MODE=true
```

## SQL Server Hazırlığı

v3.0.0 ile SQL Server bağlantı havuzu hazırlığı eklendi. Vega içindeki gerçek tablo, ürün kodu ve fiyat alanları kesinleşene kadar demo mod korunur.

`.env` içinde `DEMO_MODE=true` kaldığında servis mevcut demo ürünü döndürür. `DEMO_MODE=false` yapılırsa `SQL_PRICE_QUERY` içindeki placeholder sorgu denenir. Sorgu hata alırsa servis çökmez; JSON hata cevabı döner.

Örnek `.env` alanları:

```env
SQL_SERVER=
SQL_DATABASE=
SQL_USER=
SQL_PASSWORD=
SQL_PORT=1433
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
SQL_PRICE_QUERY=
SQL_TEST_BARCODE=MB-1001
```

`SQL_PRICE_QUERY` parametreli olmalıdır ve barkod/ürün kodu için `@code` parametresini kullanmalıdır. Sorgunun ilk satırında `code`, `name` ve `price` alanları ya da bunlara karşılık gelen Vega alanları döndürülmelidir.

## Vega SQL tablo keşfi

Gerçek Vega tablo adı ve fiyat alanları kesinleşmeden `DEMO_MODE=true` korunmalıdır. Keşif sırasında hedef alanlar şunlardır:

- Barkod kolonu: barkod okuyucudan gelen değerle eşleşecek alan.
- Stok kodu kolonu: terminalde ürün kodu olarak gösterilecek alan.
- Ürün adı kolonu: terminalde ürün adı olarak gösterilecek alan.
- Satış fiyatı kolonu: terminalde fiyat olarak dönecek alan.
- Aktif/pasif ürün filtresi: pasif, silinmiş veya satışa kapalı ürünleri ayıracak güvenli filtre.
- Fiyat listesi / depo / şube ayrımı: aynı ürün için farklı fiyat varsa kullanılacak seçim kuralı.

Placeholder sorgu gerçek Vega tablo adı kesinleşmeden örnek olarak tutulmalıdır:

```sql
SELECT TOP (1)
  CAST(<stok_kodu_kolonu> AS nvarchar(80)) AS code,
  CAST(<urun_adi_kolonu> AS nvarchar(255)) AS name,
  CAST(<satis_fiyati_kolonu> AS decimal(18, 2)) AS price
FROM <vega_urun_veya_barkod_tablosu>
WHERE <barkod_veya_stok_kodu_kolonu> = @code
  AND <aktif_urun_filtresi>
```

Bu örnek tablo/kolon adlarını kesin bilgi gibi kullanmaz. Gerçek sorgu yalnızca Vega tablo keşfi tamamlandıktan sonra `.env` içindeki `SQL_PRICE_QUERY` alanına taşınmalıdır.

## Read-only keşif scriptleri

v3.2.0 ile Vega SQL tablo, kolon ve fiyat sorgusu doğrulaması için read-only scriptler eklendi. Windows'ta `local-price-service` klasörü içinden çalıştırılır:

```powershell
node scripts/discover-tables.js
node scripts/discover-columns.js TABLO_ADI
node scripts/test-price-query.js
node scripts/analyze-discovery-reports.js
node scripts/generate-price-query.js
node scripts/run-generated-query.js
node scripts/price-lookup-pipeline.js
node scripts/test-vega-joined-price-query.js
```

Rapor dosyası kaydetmek için `--save` parametresi eklenir:

```powershell
node scripts/discover-tables.js --save
node scripts/discover-columns.js TABLO_ADI --save
node scripts/test-price-query.js --save
node scripts/analyze-discovery-reports.js --save
node scripts/generate-price-query.js --save
node scripts/run-generated-query.js --save
node scripts/test-vega-joined-price-query.js --save
```

Gerçek test için önerilen sıralı akış:

```powershell
node scripts/discover-tables.js --save
node scripts/discover-columns.js TABLO_ADI --save
node scripts/analyze-discovery-reports.js --save
node scripts/generate-price-query.js --save
node scripts/price-lookup-pipeline.js
```

Scriptlerin amacı:

- `discover-tables.js`: barkod, stok ve fiyat çağrışımı yapan tablo adlarını metadata üzerinden listeler.
- `discover-columns.js`: verilen tablonun kolonlarını listeler; barkod, stok, kod, ad, açıklama, fiyat ve satış kelimelerini öne çıkarır.
- `test-price-query.js`: `.env` içindeki `SQL_PRICE_QUERY` ve `SQL_TEST_BARCODE` ile parametreli read-only deneme yapar.
- `analyze-discovery-reports.js`: `reports/discovered-tables.json` ve `reports/discovered-columns-*.json` çıktılarından fiyat sorgusu için en güçlü tablo/kolon adaylarını önerir.
- `generate-price-query.js`: `reports/price-query-candidates.json` içindeki en yüksek skorlu adaydan güvenli bracket escape uygulanmış `SQL_PRICE_QUERY` önerisi üretir.
- `run-generated-query.js`: `reports/generated-price-query.json` içindeki sorguyu `SQL_TEST_BARCODE` ile kontrollü olarak gerçek SQL Server bağlantısında dener.
- `price-lookup-pipeline.js`: rapor ön koşullarını, `SQL_TEST_BARCODE` değerini ve generated sorguyu kontrol ederek tek komutla read-only fiyat sorgusu testi yapar.
- `test-vega-joined-price-query.js`: `F0102TBLBIRIMLEREX.STOKNO = F0102TBLSTOKLAR.IND` join'i ile `MALINCINSI` ürün adını read-only test eder.

Güvenlik notu: Bu scriptler veri yazmaz; sadece SELECT ve metadata kontrolü yapar. `test-price-query.js`, `run-generated-query.js`, `price-lookup-pipeline.js` ve `test-vega-joined-price-query.js` SELECT dışındaki yazma/yönetim komutlarını fail-closed reddeder. `--save` ile oluşan rapor dosyaları Vega/SQL verisi yazma işlemi değildir; yalnızca `local-price-service/reports/` altında tutulan lokal analiz çıktısıdır. `generate-price-query.js` ürettiği sorguyu otomatik olarak `.env` içine yazmaz; gerçek kullanımdan önce insan onayı gerekir.

## Endpointler

### GET /health

```json
{
  "ok": true,
  "service": "melisa-terminal-price-service",
  "demoMode": true,
  "sql": {
    "configured": false,
    "status": "demo-mode"
  }
}
```

### GET /product-price?code=MB-1001

```json
{
  "found": true,
  "code": "MB-1001",
  "name": "Bebek Takım",
  "price": 485
}
```

Ürün bulunamazsa:

```json
{
  "found": false,
  "code": "XXX",
  "message": "Ürün bulunamadı"
}
```

## Not

Bu servis v3.8.0 hazırlık iskeletidir. Demo mod varsayılan olarak açıktır. Gerçek Vega tablo/ad alanı netleşmeden demo mod kapatılmamalıdır.

## v4.2.0 fiyat marker arama

Vega ekraninda test urunune yazilan belirgin satis fiyati degerini SQL Server numeric kolonlarinda read-only aramak icin:

```powershell
node scripts/find-price-marker-value.js
node scripts/find-price-marker-value.js --save
```

Script `.env` icinden `PRICE_MARKER_VALUE` ve `SQL_TEST_BARCODE` degerlerini okur. Yalnizca `INFORMATION_SCHEMA.COLUMNS` metadata okur ve numeric aday kolonlarda parametreli `SELECT` calistirir. `--save` verilirse sonuc `local-price-service/reports/find-price-marker-value.json` dosyasina yazilir.

Guvenlik notu: Bu script veri yazmaz; `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`, `MERGE` ve `EXEC` komutlarini calistiracak bir akis icermez.

## v4.3.0 gercek Vega fiyat sorgusu

`F0102TBLBIRIMLEREX.SATISFIYATI1` alani Vega'daki `1. Satis Fiyati` icin dogrulanan fiyat alanidir. Para birimi `F0102TBLBIRIMLEREX.PB1` uzerinden opsiyonel `currency` alanina tasinir.

`.env.example` icindeki `SQL_PRICE_QUERY` ornegi barkoddan `code`, `name`, `price` ve `currency` dondurur. Gercek `.env` dosyasina alinmadan once saha bilgisayari uzerinde read-only test edilmelidir.
