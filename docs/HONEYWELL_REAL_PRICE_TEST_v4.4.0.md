# Honeywell Real Price Test v4.4.0

## Amaç

Honeywell terminalde Local Price Service üzerinden gerçek Vega fiyat okuma akışını saha testine hazırlamak.

## Bilinen Vega Alanları

- Barkod: `dbo.F0102TBLBIRIMLEREX.BARCODE`
- Ürün adı: `dbo.F0102TBLSTOKLAR.MALINCINSI`
- Fiyat: `dbo.F0102TBLBIRIMLEREX.SATISFIYATI1`
- Para birimi: `dbo.F0102TBLBIRIMLEREX.PB1`

## PC Hazırlığı

```powershell
cd local-price-service
npm install
npm start
```

`.env` içinde:

```env
DEMO_MODE=false
SQL_PRICE_QUERY=<v4.3.0 ile doğrulanan SATISFIYATI1 sorgusu>
```

Servis varsayılan olarak `8787` portunda çalışır. Aynı ağdaki terminalden erişim için örnek adres:

```text
http://192.168.1.50:8787
```

## Terminal Test Adımları

1. Terminal uygulamasında `Ayarlar` ekranını aç.
2. API adresine PC’nin LAN adresini gir.
3. Fiyat Kaynağı modunu `Gerçek Servis` seç.
4. `Bağlantıyı Kontrol Et` butonuna bas.
5. Başarılı mesajı gör: `Local fiyat servisi bağlı - Vega fiyat okuma hazır`.
6. `Yeni Fiş` ekranında barkod okut.
7. Ürün adı, fiyat ve para birimi bilgisinin göründüğünü doğrula.

## Beklenen Davranış

- Ürün bulunursa fiyat gerçek servis cevabından gelir.
- Servis `currency` döndürürse fiyat metninde o para birimi kullanılır.
- Ürün bulunamazsa `Ürün bulunamadı` mesajı gösterilir.
- Uygulama servis yokken veya ürün bulunamadığında çökmez.

## Güvenlik

- Terminal uygulaması veri yazmaz.
- Local Price Service sorgusu read-only çalışır.
- `.env`, SQL şifresi veya credential bilgisi dokümana yazılmaz.
