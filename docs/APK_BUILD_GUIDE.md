# APK Build Rehberi

Bu doküman Melisa Bebe Terminal uygulamasını Expo Go testinden APK kurulum testine taşımak için hazırlanmıştır. Bu sürümde EAS bağımlılığı eklenmez ve gerçek build çalıştırmak zorunlu değildir.

## Expo Go Test ile APK Test Arasındaki Fark

Expo Go testinde uygulama Metro sunucusundan çalışır ve geliştirme sırasında hızlı güncellenir. APK testinde uygulama Android paketine alınır, Honeywell terminale kurulur ve Expo Go olmadan açılır.

Expo Go testi hızlı geliştirme içindir. APK testi kurulum, cihaz izinleri, uygulama adı, paket adı, geri tuşu, scanner-wedge ve cihaz performansı için yapılır.

## APK Build İçin Önerilen Yol

1. `package.json` version ve `app.json` expo.version aynı olmalıdır.
2. `app.json` içinde `name`, `slug` ve `android.package` kontrol edilmelidir.
3. `npm run typecheck` başarılı olmalıdır.
4. Honeywell Expo Go testi tamamlanmalıdır.
5. Kurumun tercih ettiği Android build hattı seçilmelidir.
6. APK kurulum testi release checklist ile yapılmalıdır.

Mevcut app config:

- Uygulama adı: `Melisa Bebe Terminal`
- Slug: `melisa-terminal-app`
- Android package: `com.melisabebe.terminal`

## EAS Build Kullanılacaksa

EAS Build kullanılacaksa önce EAS CLI, Expo hesabı, proje bağlantısı ve build profilleri ayrıca hazırlanmalıdır. Bu repo şu an EAS dependency veya EAS build scripti içermez.

Hazırlık tamamlandıktan sonra tipik komut akışı şu şekildedir:

```powershell
npm run typecheck
npx eas build:configure
npx eas build -p android --profile preview
```

Bu komutlar sadece EAS kurulumu tamamlandıktan sonra kullanılmalıdır. EAS kurulumu yapılmadan build komutunu zorlamak doğru değildir.

## Honeywell Cihazda APK Kurulum Adımları

1. APK dosyasını Honeywell terminale aktar.
2. Cihaz güvenlik politikasına göre bilinmeyen kaynaklardan yükleme iznini aç.
3. APK dosyasını kur.
4. Uygulamayı `Melisa Bebe Terminal` adıyla aç.
5. Sağ üst versiyon etiketini kontrol et.
6. Login, ana menü, yeni fiş, QR albüm, mesajlar, gönderilemeyenler ve ayarlar ekranlarını kontrol et.

## Bilinmeyen Kaynak İzni

APK manuel kurulacaksa Honeywell cihazda dosya yöneticisi veya kurulum kaynağı için bilinmeyen uygulama yükleme izni gerekebilir. Bu izin kurum güvenlik politikasına göre açılmalıdır.

## APK Sonrası Kontrol Listesi

- Uygulama adı doğru mu?
- Sağ üst versiyon etiketi doğru mu?
- Giriş ekranı status bar ile çakışmıyor mu?
- Ana menü alt tuş alanına taşmıyor mu?
- Android geri tuşu kontrollü çalışıyor mu?
- Barkod okutma inputa düşüyor mu?
- Ürün ekleme sonrası input tekrar odaklanıyor mu?
- Çift okutma koruması çalışıyor mu?
- Titreşim ayarları çalışıyor mu?
- QR Albüm bağlantı ve ürün kartları görünüyor mu?

## Sorun Giderme

- APK kurulmazsa Android package ve cihaz güvenlik politikası kontrol edilmelidir.
- Uygulama açılırken kapanırsa son build logları ve Expo SDK uyumu kontrol edilmelidir.
- Scanner okutma inputa düşmüyorsa Honeywell scanner-wedge klavye modu kontrol edilmelidir.
- Versiyon etiketi beklenen sürümü göstermiyorsa `package.json` version kontrol edilmelidir.
- Ekran taşması varsa safe area ve alt tuş boşluğu gerçek cihazda tekrar kontrol edilmelidir.
