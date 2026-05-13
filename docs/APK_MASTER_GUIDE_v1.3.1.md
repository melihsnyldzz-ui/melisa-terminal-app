# v1.3.1 APK Master Guide

## Amac

APK hazirlik dokumanlarini tek ana rehberde toplamak.

## Build oncesi kontrol

1. Web Preview linki acilir.
2. Login ekraninda guncel surum kontrol edilir.
3. Yeni Fis demo akisi tamamlanir.
4. QR Album fiyat gostermeden kontrol edilir.
5. Acik Fisler, Mesajlar ve Gonderilemeyenler ekranlari acilir.
6. Veri Guncelle ve Ayarlar ekranlari kontrol edilir.
7. TypeScript check calistirilir.
8. Honeywell cihazda barkod focus testi yapilir.

## Build komutlari

```powershell
npm run check
npm run doctor
```

EAS APK build komutu ayrica onayla ve uygun ortamda calistirilmalidir.

## APK sonrasi test

- Uygulama adi dogru mu?
- Versiyon etiketi gorunuyor mu?
- Login ekrani aciliyor mu?
- Barkod input focus aliyor mu?
- Android geri tusu beklenen sekilde calisiyor mu?
- QR Album ve Mesajlar ekranlari aciliyor mu?

## Karar

Bu kontroller basarili olursa APK test fazina gecilebilir.
