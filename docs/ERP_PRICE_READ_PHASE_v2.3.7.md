# v2.3.7 ERP Price Read Phase

## Amaç

Honeywell APK testinden sonra ilk gerçek ERP fazını sadece fiyat okuma ile sınırlamak.

## Neden sadece fiyat okuma?

Yeni Fiş ekranında satış personelinin ilk ihtiyacı barkod sonrası ürün adı ve fiyatı görmektir. Bu fazda canlı sisteme veri yazmak gereksiz risk doğurur.

## İlk faz kapsamı

- Barkod veya ürün kodu alınır.
- ERP veya ara servis üzerinden ürün aranır.
- Ürün adı okunur.
- Birim fiyat okunur.
- Yeni Fiş ekranında fiyat kartı gösterilir.
- Personel adeti girer.
- Fiş satırı uygulama içinde mock/taslak olarak oluşur.

## Bu faza dahil olmayanlar

- Canlı fiş kaydı
- Stok düşme
- Canlı müşteri bakiyesi
- Tahsilat
- İrsaliye / fatura oluşturma
- ERP verisine yazma

## Teknik öneri

İlk entegrasyon doğrudan terminal ekranından SQL'e bağlanarak değil, güvenli bir ara servis üzerinden yapılmalıdır.

Önerilen akış:

1. Terminal barkodu gönderir.
2. Ara servis ürünü bulur.
3. Ara servis sadece gerekli alanları döner.
4. Terminal ürün adı ve fiyatı gösterir.

## Döndürülmesi gereken minimum veri

```json
{
  "code": "MB-1001",
  "name": "Bebek Takım",
  "price": 485
}
```

## Kabul kriteri

- Barkod sonrası fiyat hızlı gelir.
- Ürün bulunamazsa net uyarı verilir.
- Fiyat okuma hatası uygulamayı çökertmez.
- Canlı veri yazma yapılmaz.

## Sonraki faz

Fiyat okuma stabil olduktan sonra stok okuma veya canlı fiş yazma ayrıca değerlendirilmelidir.
