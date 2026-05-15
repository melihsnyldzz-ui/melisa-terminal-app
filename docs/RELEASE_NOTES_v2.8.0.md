# Melisa Bebe Terminal v2.8.0

## Local LAN Price Service kontrollu gecis

- Terminal ayarlarina `mock`, `real` ve `fallback` fiyat kaynagi secimi eklendi.
- Varsayilan fiyat kaynagi `fallback`: servis varsa yerel fiyat servisini kullanir, servis yoksa mock urune guvenli sekilde duser.
- `mock` modunda yalnizca demo urunler kullanilir.
- `real` modunda yalnizca local fiyat servisi denenir; servis yoksa veya urun bulunamazsa uygulama cokmeden net uyari verir.
- Baglanti testi artik local servis bagli, servis yok/mock kullanilacak ve gecersiz API adresi durumlarini ayri mesajlarla gosterir.
- Yeni Fis ekraninda urun bulunamadi ve servis yok durumlari kontrollu uyarida kalir.

## Guvenlik siniri

- Veri yazma, import, export, sync veya cari/kasa/finans/fatura akisi eklenmedi.
- Mevcut local price service okuma mantigi korunur; terminal tarafinda yeni SQL veya servis fonksiyonu eklenmedi.
