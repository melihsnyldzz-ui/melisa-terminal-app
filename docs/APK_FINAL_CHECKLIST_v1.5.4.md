# v1.5.4 APK Final Checklist

## Amac

APK build oncesi son kontrol listesini netlestirmek.

## Zorunlu kontroller

- Web Preview guncel surumu gosteriyor mu?
- Login ekrani aciliyor mu?
- Dashboard demo karti gorunuyor mu?
- Yeni Fis musteri arama calisiyor mu?
- Barkod input focus davranisi test edildi mi?
- Hizli demo urun kodlari calisiyor mu?
- QR Album fiyat gostermeden aciliyor mu?
- Acik Fisler arama ve filtreleri calisiyor mu?
- Mesajlar arama ve filtreleri calisiyor mu?
- Gonderilemeyenler tekrar dene akisi calisiyor mu?
- Veri Guncelle ve Ayarlar ekranlari aciliyor mu?

## Build oncesi komutlar

```powershell
npm run check
npm run doctor
```

## Karar

Bu kontroller gecmeden APK build baslatilmamalidir.
