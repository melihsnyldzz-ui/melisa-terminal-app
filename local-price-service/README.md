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
```

`SQL_PRICE_QUERY` parametreli olmalıdır ve barkod/ürün kodu için `@code` parametresini kullanmalıdır. Sorgunun ilk satırında `code`, `name` ve `price` alanları ya da bunlara karşılık gelen Vega alanları döndürülmelidir.

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

Bu servis v3.0.0 hazırlık iskeletidir. Demo mod varsayılan olarak açıktır. Gerçek Vega tablo/ad alanı netleşmeden demo mod kapatılmamalıdır.
