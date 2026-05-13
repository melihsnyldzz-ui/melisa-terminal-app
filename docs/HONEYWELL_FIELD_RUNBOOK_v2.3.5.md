# v2.3.5 Honeywell Field Runbook

## Amaç

Honeywell cihaz üzerinde terminal uygulamasının gerçek kullanım davranışını ölçmek.

Bu aşamada UI sadeleştirme yapılmaz. Öncelik iş akışının doğru çalışmasıdır.

## Test sırası

### 1. Açılış

- APK cihazda açılıyor mu?
- Login ekranı okunuyor mu?
- Dashboard ekranda taşma yapıyor mu?
- Sürüm etiketi doğru görünüyor mu?

### 2. Yeni Fiş

- Yeni Fiş ekranı açılıyor mu?
- Müşteri arama çalışıyor mu?
- Müşteri seçilince fiş başlatılabiliyor mu?
- Fiş başlatılınca barkod alanı aktif oluyor mu?

### 3. Barkod / Focus

- Fiziksel scanner barkod alanına kod basıyor mu?
- Barkod okutunca ürün bulunuyor mu?
- Fiyat kartı görünüyor mu?
- Fiyat okunabilir mi?
- Soft keyboard gereksiz açılıyor mu?
- Ürün bulunduktan sonra adet alanına geçmek kolay mı?

### 4. Adet / Fişe Ekleme

- Adet alanına sayı girilebiliyor mu?
- Ürün fişe girilen adetle ekleniyor mu?
- Satır tutarı doğru görünüyor mu?
- Toplam tutar güncelleniyor mu?
- Ürün eklendikten sonra barkod alanına geri dönmek kolay mı?

### 5. QR Albüm

- QR Albüm ekranı açılıyor mu?
- Ürün listesi görünüyor mu?
- Fiyat görünmüyor mu?
- Link/WhatsApp önizlemesi okunuyor mu?

### 6. Ayarlar / Kurtarma

- Ayarlar ekranı açılıyor mu?
- Aktif Taslağı Sıfırla aksiyonu görünüyor mu?
- Aktif taslak sıfırlanınca Yeni Fiş temiz açılıyor mu?

## Test sonucu formatı

- Cihaz modeli:
- Uygulama sürümü:
- Test eden:
- Tarih:

### Geçti

- 

### Kaldı

- 

### Acil düzeltme gerekenler

- 

## Sonraki kod patch adayları

Gerçek test sonucuna göre sadece gerekli patch uygulanacak:

1. Barkod alanında soft keyboard kapatma.
2. Ürün eklenince barkod alanına otomatik focus dönüşü.
3. Adet alanından Enter ile fişe ekleme.
4. Fiyat kartını büyütme.
5. Dashboard sadeleştirme.

## Not

Saha testi bitmeden UI sadeleştirme finaline geçilmez.
