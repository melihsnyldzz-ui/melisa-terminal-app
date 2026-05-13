# v1.0.0 Web Preview Test Checklist

## Giris

- Web preview linki acilir.
- Login ekraninda surum 1.0.0 gorunur.
- PIN alanina herhangi bir sayi yazilarak giris yapilir.

## Dashboard

- Dashboard acilir.
- Son aktif fis karti gorunur.
- Hizli aksiyonlar calisir.
- Moduller iki kolonlu gorunur.

## Yeni Fis

- Musteri arama alani calisir.
- Musteri secilince secili musteri karti gorunur.
- Fis baslatilinca barkod alani aktif olur.
- Hizli urun kodu ile urun eklenir.
- Urun listesinde kalem ve adet ozeti gorunur.

## Acik Fisler

- Fis no veya musteri adi ile arama yapilir.
- Durum filtreleri kontrol edilir.
- QR Album ve Gonder aksiyonlari mock mesaj verir.

## QR Album

- Aktif fis varsa musteri, fis no ve urun bilgisi gorunur.
- Fiyat bilgisi gorunmez.
- WhatsApp mesaj onizlemesi gorunur.

## Mesajlar

- Mesaj arama calisir.
- Acil ve okunmamis filtreleri kontrol edilir.
- Fise bagli mesaj secilince detay karti gorunur.

## Gonderilemeyenler

- Kuyruk ozeti gorunur.
- Hata nedeni karti gorunur.
- Tekrar dene aksiyonu mock olarak calisir.

## Ayarlar ve Veri Guncelle

- Terminal sagligi kartlari gorunur.
- Veri Guncelle ekraninda mock senkron merkezi gorunur.

## Not

Web preview barkod okuyucu donanim davranisini test etmez. Bu kontrol gorsel ve mock akis testidir.
