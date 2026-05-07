# melisa-terminal-app

Melisa Bebe Android el terminalleri için React Native + Expo + TypeScript uygulama iskeleti.

## Proje Amacı

Bu uygulama personelin saha, depo ve satış işlemlerini hızlı, sade ve güvenli şekilde yapması için hazırlanır. İlk sürüm gerçek Vega / SQL bağlantısı yapmaz; mock data ve local storage ile çalışır.

## Kurulum

```powershell
npm install
```

## Çalıştırma

```powershell
npm start
```

## Android Cihazda Test

1. Android cihaz ile bilgisayar aynı ağda olmalı.
2. Expo Go uygulaması cihaza kurulmalı.
3. `npm start` sonrası çıkan QR kod Expo Go ile okutulmalı.
4. Fiziksel el terminalinde ekranlar büyük butonlar ve sade akışla kontrol edilmeli.

## Expo Go ile Test

Expo geliştirme sunucusu açıldıktan sonra terminalde görünen QR kod okutulur. Bu sürümde gerçek API, Vega veya SQL bağlantısı yoktur.

## Klasör Yapısı

- `app/`: Ekranlar ve tema
- `components/`: Ortak buton, kart ve ekran kabuğu
- `services/`: Mock API fonksiyonları
- `storage/`: AsyncStorage yardımcıları
- `types/`: TypeScript tipleri
- `scripts/`: Local kontrol scriptleri
- `docs/`: Teknik notlar

## Sürüm Planı

- `v0.1.0`: Login, dashboard, yeni fiş, açık fiş, QR albüm, mesajlar, gönderilemeyenler, veri güncelle ve ayarlar iskeleti
- Sonraki fazlar: gerçek ERP API bağlantısı, offline kuyruk sertleştirme, bildirim/ses/titreşim, QR albüm servis bağlantısı

## Kontrol Komutları

```powershell
npm run typecheck
npm run doctor
npm start -- --help
.\scripts\check-terminal.ps1
```

## GitHub Çalışma Düzeni

- `main` varsayılan branch olarak kullanılır.
- Build/test başarılı olmadan commit ve push yapılmaz.
- Mevcut ERP projesi ayrı repodadır; bu projeden ERP dosyaları değiştirilmez.
