# v2.5.1 Local LAN Price Service Plan

## Karar

ERP fiyat okuma ara servisi local ağdaki bir PC üzerinde çalışacaktır.

## Temel mimari

Honeywell terminal doğrudan SQL veya ERP veritabanına bağlanmaz.

Akış:

1. Honeywell terminal barkod veya ürün kodunu okur.
2. Terminal local ağdaki fiyat servisine istek gönderir.
3. Local PC üzerindeki servis Vega/ERP/SQL tarafında ürünü arar.
4. Servis sadece ürün adı ve fiyat bilgisini terminale döner.
5. Terminal Yeni Fiş ekranında fiyat kartını gösterir.
6. Personel adet girer.
7. Fiş terminal uygulamasında taslak olarak devam eder.

## Önerilen local servis adresi

İlk test için örnek:

```text
http://192.168.1.50:8787
```

Not: IP adresi local ağdaki servis çalışacak PC'nin sabit IP adresi olmalıdır.

## Önerilen endpoint

```text
GET /product-price?code=MB-1001
```

## Örnek başarılı cevap

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
  "code": "MB-1001",
  "message": "Ürün bulunamadı"
}
```

## Bu fazda kesinlikle yapılmayacaklar

- Canlı fiş yazma
- Stok düşme
- Fatura veya irsaliye oluşturma
- Tahsilat
- Müşteri bakiyesi değiştirme
- Terminalden doğrudan SQL bağlantısı

## Kabul kriteri

Terminal local ağda servise ulaşmalı, barkoddan ürün adı ve fiyatı almalı, hata durumunda uygulama çökmeden uyarı vermelidir.
