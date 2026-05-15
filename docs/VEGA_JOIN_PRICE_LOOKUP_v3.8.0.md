# Vega Joined Price Lookup v3.8.0

Bu not, `F0102TBLBIRIMLEREX` barkod/fiyat kaydı ile `F0102TBLSTOKLAR` stok kartı bilgisini read-only şekilde birleştirme denemesini açıklar.

## Bilinen keşif

- Barkod tablosu: `F0102TBLBIRIMLEREX`
- Barkod kolonu: `BARCODE`
- Mevcut kısa açıklama kolonu: `ACIKLAMA`
- Mevcut fiyat kolonu: `SATISFIYATI`
- Stok kartı tablosu: `F0102TBLSTOKLAR`
- İlişki: `F0102TBLBIRIMLEREX.STOKNO = F0102TBLSTOKLAR.IND`
- Önerilen ürün adı: `F0102TBLSTOKLAR.MALINCINSI`

## Test sorgusu

```sql
SELECT TOP (1)
  CAST(b.BARCODE AS nvarchar(80)) AS code,
  CAST(s.MALINCINSI AS nvarchar(255)) AS name,
  CAST(b.SATISFIYATI AS decimal(18, 2)) AS price
FROM F0102TBLBIRIMLEREX b
LEFT JOIN F0102TBLSTOKLAR s
  ON b.STOKNO = s.IND
WHERE b.BARCODE = @code
```

## Güvenlik

- Sorgu sadece `SELECT` çalıştırır.
- `@code` parametresi zorunludur.
- Yazma/yönetim komutları fail-closed reddedilir.
- Sonuç `--save` ile sadece lokal analiz raporu olarak kaydedilir.
- `.env` içeriği ve şifreler rapora yazılmaz.
