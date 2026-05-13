# v2.3.0 Fast APK / Honeywell Next Phase

## Hedef

Terminal uygulamasinda Web Preview demo fazindan APK ve Honeywell test fazina hizli gecis yapmak.

## Guncel durum

- Web Preview demo akisi calisir hale geldi.
- Yeni Fis ekrani aciliyor.
- Barkod/kod sonrasi fiyat gorunuyor.
- Direkt adet girme akisi hazir.
- QR Album fiyat gostermeme kurali korunuyor.
- Ayarlar ekraninda Aktif Taslagi Sifirla aksiyonu var.
- EAS preview APK profili mevcut.

## Hizli test sirasi

1. Web Preview linkini ac.
2. Login yap.
3. Ayarlar ekraninda Aktif Taslagi Sifirla aksiyonunu dene.
4. Dashboard uzerinden Yeni Fis ekranina gir.
5. Musteri sec.
6. Fisi baslat.
7. Demo urun kodu ile urun bul.
8. Fiyat kartini kontrol et.
9. Adet gir.
10. Urunu fise ekle.
11. QR Album ekraninda fiyat gorunmedigini kontrol et.
12. Local ortamda npm run check calistir.
13. Check basariliysa preview APK build fazina gec.

## APK build komutu

```powershell
npx eas build --platform android --profile preview
```

## Honeywell testinde bakilacaklar

- Uygulama aciliyor mu?
- Yeni Fis ekrani aciliyor mu?
- Scanner inputa kod basiyor mu?
- Barkod input focus koruyor mu?
- Fiyat karti okunuyor mu?
- Adet alani kolay kullaniliyor mu?
- Urun fise ekleniyor mu?
- QR Album fiyat gostermiyor mu?
- Android geri tusu dogru calisiyor mu?

## Risk siniri

Canli ERP yazma, stok dusme, fis kaydetme ve canli musteri verisi bu faza dahil degildir. Ilk ERP fazi sadece fiyat okuma olarak planlanmalidir.

## Paket notu

Bu paket daha az onay cikmasi icin tek ana dokumanda toplandi.
