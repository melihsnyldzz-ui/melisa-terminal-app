# Melisa Terminal Local Price Service

Windows bilgisayarda terminal uygulamasına demo fiyat cevabı vermek için hazırlanmış Express servis iskeletidir.

## Kurulum

```powershell
cd local-price-service
npm install
npm start
```

Varsayılan port `.env` üzerinden ayarlanır:

```env
PORT=8787
```

## Endpointler

### GET /health

```json
{
  "ok": true,
  "service": "melisa-terminal-price-service"
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

Bu servis v2.9.0 hazırlık iskeletidir. Şimdilik demo veri döndürür; ERP, Vega, SQL veya dosya yazma bağlantısı içermez.
