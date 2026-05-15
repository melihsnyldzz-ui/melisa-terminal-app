# Vega Real Price Query v4.3.0

## Amaç

Local Price Service içinde barkoddan gerçek Vega satış fiyatını read-only döndürmek.

## Doğrulanan Alanlar

- Barkod tablosu: `dbo.F0102TBLBIRIMLEREX`
- Barkod kolonu: `BARCODE`
- Stok ilişkisi: `F0102TBLBIRIMLEREX.STOKNO = F0102TBLSTOKLAR.IND`
- Ürün adı: `F0102TBLSTOKLAR.MALINCINSI`
- Gerçek 1. satış fiyatı: `F0102TBLBIRIMLEREX.SATISFIYATI1`
- Para birimi: `F0102TBLBIRIMLEREX.PB1`

## Önerilen SQL_PRICE_QUERY

```sql
SELECT TOP (1)
  CAST(b.BARCODE AS nvarchar(80)) AS code,
  CAST(s.MALINCINSI AS nvarchar(255)) AS name,
  CAST(b.SATISFIYATI1 AS decimal(18, 2)) AS price,
  CAST(b.PB1 AS nvarchar(10)) AS currency
FROM dbo.F0102TBLBIRIMLEREX b
LEFT JOIN dbo.F0102TBLSTOKLAR s
  ON b.STOKNO = s.IND
WHERE b.BARCODE = @code
```

## Güvenlik

- Sorgu sadece `SELECT TOP (1)` çalıştırır.
- Barkod değeri `@code` parametresiyle verilir.
- Veri yazma, import, export veya sync işlemi içermez.
- `.env` içindeki credential bilgileri dokümana veya rapora yazılmaz.
