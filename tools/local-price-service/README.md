# v2.6.1 Local Price Service

## Amaç

Honeywell terminalin local ağdaki bir PC üzerinden ürün adı ve fiyat okumasını test etmek.

Bu servis ilk aşamada sadece mock cevap döner. Canlı ERP, SQL, stok veya fiş yazma bağlantısı içermez.

## İlk endpoint

```text
GET /product-price?code=MB-1001
```

## Başarılı örnek cevap

```json
{
  "found": true,
  "code": "MB-1001",
  "name": "Bebek Takım",
  "price": 485
}
```

## Ürün bulunamadı cevabı

```json
{
  "found": false,
  "code": "ABC",
  "message": "Ürün bulunamadı"
}
```

## Güvenlik sınırı

Bu servis ilk fazda kesinlikle canlı veriye yazmaz.

Yapılmayanlar:

- Canlı fiş kaydı
- Stok düşme
- Fatura veya irsaliye oluşturma
- Tahsilat
- Müşteri bakiyesi değiştirme
- Terminalde SQL şifresi tutma

## Local test portu

```text
http://localhost:8787
```

Local ağdaki diğer cihazlardan test için PC IP adresi kullanılır:

```text
http://192.168.1.50:8787/product-price?code=MB-1001
```
