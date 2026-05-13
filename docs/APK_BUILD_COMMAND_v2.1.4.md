# v2.1.4 APK Build Command Guide

## Amac

Preview APK build komutunu ve oncesindeki kontrol sirasini netlestirmek.

## Build oncesi kontrol

```powershell
npm run check
```

## Preview APK build komutu

```powershell
npx eas build --platform android --profile preview
```

## Build sonrasi

- APK linki indirilir.
- Honeywell cihaza kurulur.
- Yeni Fis fiyat/adet akisi test edilir.
- Barkod focus ve soft keyboard davranisi kontrol edilir.

## Not

Bu komut bu paket icinde calistirilmadi. Build local veya yetkili ortamda calistirilmalidir.
