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

## Gerçek Honeywell Terminalde Expo Go ile Test

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run start:lan
```

Honeywell terminal ve bilgisayar aynı ağdaysa Expo Go ile terminalde görünen QR kod okutulur. Ağ kısıtı varsa tünel bağlantısı denenebilir:

```powershell
npm run start:tunnel
```

## Expo Go ile Test

Expo geliştirme sunucusu açıldıktan sonra terminalde görünen QR kod okutulur. Bu sürümde gerçek API, Vega veya SQL bağlantısı yoktur.

## Bilgisayarda Honeywell Cihaz Gibi Önizleme

Expo web ortamında uygulama otomatik olarak Honeywell benzeri koyu antrasit cihaz çerçevesi içinde gösterilir. Bu görünüm sadece bilgisayar/web geliştirme önizlemesi içindir; Android ve iOS tarafında normal uygulama ekranı çalışır.

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run preview:honeywell
```

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
- `v0.2.0`: Kullanıcı dostu terminal deneyimi; TerminalHeader, durum rozetleri, boş durumlar, banner mesajları, adım yönlendirmeleri ve mock aksiyon geri bildirimleri
- `v0.2.1`: Operasyon akışı güçlendirme; aktif fiş taslağı local storage'a kaydedilir, barkod/QR kod inputu ile mock ürün eklenir, ürün kalemleri adet/sil aksiyonlarıyla yönetilir, QR albüm fiş ürünlerine daha bağlı görünür
- `v0.2.2`: Giriş ekranı görsel iyileştirmesi, ana menü görsel iyileştirmesi, teknik ifadelerin UI'dan kaldırılması ve Honeywell preview görünümünün korunması
- `v0.2.4`: Gerçek Honeywell terminal ekranı için spacing, typography, kart, input, buton ve liste yoğunluğu sıkılaştırması
- `v0.2.5`: Honeywell terminal safe area, alt tuş boşluğu ve Android donanım geri tuşu çift basış çıkış düzeltmesi
- `v0.2.6`: Login ekranı ve dashboard ana menü görsel iyileştirme; Honeywell terminal ekranına göre daha premium UI düzeni; safe area davranışı korunmuştur; görünür uygulama versiyonu eklenmiştir
- `v0.3.0`: Gerçekçi fiş akışı, barkod/QR input, ürün satırları, local aktif fiş taslağı ve QR albüm hazırlama aksiyonu
- `v0.3.1`: Aktif fişe bağlı QR albüm, güvenli link önizlemesi, WhatsApp mesaj önizlemesi ve fiyat gösterilmeme kuralı
- `v0.3.2`: Scanner-wedge barkod input odak optimizasyonu, son okutulan ürün alanı, hızlı ürün kodları ve çift okutma koruması
- `v0.3.3`: Ana menü hızlı işlem barı, kompakt bugünkü durum kartları ve iki kolonlu operasyon modülleri
- `v0.3.4`: Honeywell sıkılaştırılmış satış ekranı, son okutulan ürün alanı, çift okutma koruması ve QR albüm aksiyon grid'i
- `v0.3.5`: Premium hızlı ana menü, güçlendirilmiş son aktif fiş kartı ve kompakt operasyon modülleri
- `v0.3.6`: Operasyonel mesaj merkezi, acil mesaj uyarısı, okunmamış rozetleri ve kompakt mesaj detay akışı
- `v0.3.7`: Terminal ayar paneli, depo segment seçimi, API adresi, bağlantı kontrolü ve oturum kapatma akışı
- `v0.3.8`: Profesyonel offline kuyruk ekranı, işlem kartları, tümünü tekrar deneme ve boş kuyruk durumu
- `v0.3.9`: Açık fişler operasyon ekranı, durum filtreleri, kompakt fiş kartları ve hızlı fiş aksiyonları
- `v0.4.0`: Honeywell cihaz kalite turu; ortak safe area, alt tuş boşluğu, kompakt metin ve tutarlı ekran yoğunluğu
- Sonraki fazlar: gerçek ERP API bağlantısı, offline kuyruk sertleştirme, bildirim/ses/titreşim, QR albüm servis bağlantısı

Uygulama versiyonu TerminalHeader sağ üstünde gösterilir. Honeywell testlerinde ekranda görünen versiyon, GitHub'daki `package.json` version alanıyla uyumlu olmalıdır.

## v0.2 Kullanım Notları

- Ana ekran: `+ Yeni Fiş Başlat` ana aksiyonudur; açık fiş, okunmamış mesaj, gönderilemeyen işlem ve son senkron özeti gösterilir.
- Mesajlar: `Tümü`, `Acil`, `Fiş Notu` ve `Okunmamış` filtreleriyle iş mesajları ayrıştırılır; seçili mesaj mock olarak okundu işaretlenebilir.
- Açık Fişler: Her fişte `Aç`, `QR Albüm` ve `Gönder` mock aksiyonları vardır; durum rozetleri hata riskini görünür yapar.
- QR Albüm: Fiş, müşteri, ürün sayısı ve QR placeholder alanı gösterilir; fiyat bilgisi kesinlikle yer almaz.
- Ayarlar: Terminal bilgisi, bağlantı, senkron ve güvenlik bölümleri ayrıdır; bağlantı testi ve veri güncelleme mock banner verir.

## v0.2.1 Operasyon Akışı

- Aktif fiş: Yeni fiş başlatıldığında taslak local storage'a yazılır ve uygulama tekrar açıldığında mock taslak yüklenir.
- Mock ürün ekleme: `Barkod / QR kod gir` alanına örnek ürün kodu yazılıp `Ekle` seçildiğinde ürün satırı oluşur; fiyat gösterilmez.
- Ürün satırları: Ürün kodu, ad, renk, beden ve adet görünür; `+`, `-` ve `Sil` aksiyonları mock fiş taslağını günceller.
- QR albüm: Fiş no, müşteri, ürün sayısı, güvenli link ve ürün görsel placeholder kartları gösterilir.
- Gönderilemeyenler: Tek işlem veya tüm kuyruk için `Tekrar Dene` mock geri bildirimi verir.

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
