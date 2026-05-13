# v1.2.3 APK Build Flow Notes

## Amac

APK build asamasina gecmeden once izlenecek sirayi netlestirmek.

## Build oncesi sira

1. Web Preview demo turu tamamlanir.
2. GitHub Actions Web Preview sonucu yesil kontrol edilir.
3. TypeScript check calistirilir.
4. Expo preview ile ekranlar kontrol edilir.
5. Honeywell cihazda barkod focus testi yapilir.
6. APK build komutu ayrica onayla calistirilir.

## APK build icin beklenen komut

EAS profili hazirsa preview APK build komutu kullanilir.

## APK sonrasi kontrol

- Kurulum basarili mi?
- Uygulama adi dogru mu?
- Versiyon etiketi gorunuyor mu?
- Yeni Fis barkod input focus aliyor mu?
- QR Album ve Mesajlar ekranlari aciliyor mu?

## Not

Bu dokuman build akisini netlestirir. Build komutu bu paket icinde calistirilmadi.
