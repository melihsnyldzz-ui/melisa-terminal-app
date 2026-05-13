# v2.4.1 ERP Price Read Service Contract

## Amaç

Terminal uygulamasının ilk gerçek ERP entegrasyon fazını sadece fiyat okuma ile sınırlandırmak.

## Temel akış

1. Terminal barkod veya ürün kodunu alır.
2. Ara servis bu kodu ERP tarafında arar.
3. Ara servis sadece ürün adı ve fiyat bilgisini döner.
4. Terminal Yeni Fiş ekranında fiyat kartını gösterir.
5. Personel adet girer.
6. Fiş satırı terminal uygulamasında taslak/mock olarak oluşur.

## Terminalden servise gönderilecek veri

```json
{
  "code": "MB-1001"
}
```

## Servisten dönmesi beklenen başarılı cevap

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

## Bu fazda yapılmayacaklar

- Canlı fiş kaydı
- Stok düşme
- Tahsilat
- Fatura veya irsaliye oluşturma
- Canlı müşteri bakiyesi okuma/yazma
- ERP verisine yazma

## Kabul kriteri

Fiyat hızlı ve güvenli okunmalı; okuma hatası uygulamayı çökertmemelidir.
