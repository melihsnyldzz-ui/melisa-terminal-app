# v1.2.7 APK Build Command Notes

## Amac

APK build komutlarini ve oncesindeki kontrol siralamasini netlestirmek.

## Build oncesi komutlar

```powershell
npm run check
npm run doctor
```

## Expo preview kontrolu

```powershell
npm run preview:honeywell
```

## EAS preview build notu

EAS ayari hazirsa APK build ayrica onayla baslatilir. Build komutu local ortamda veya yetkili build ortaminda calistirilmalidir.

## APK oncesi risk kontrolu

- Web Preview guncel mi?
- Versiyon etiketi dogru mu?
- Yeni Fis barkod inputu calisiyor mu?
- QR Album fiyat gostermiyor mu?
- Android geri tusu davranisi test edildi mi?

## Not

Bu dokuman build komut akisini tarif eder. Bu paket icinde APK build calistirilmadi.
