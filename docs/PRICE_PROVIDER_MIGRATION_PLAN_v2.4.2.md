# v2.4.2 Price Provider Migration Plan

## Amaç

Yeni Fiş ekranındaki mevcut mock fiyat yapısını ileride gerçek ERP fiyat okuma servisine bağlanabilir hale getirmek.

## Mevcut durum

- services/api.ts içinde mock ürün listesi var.
- Yeni Fiş barkod/kod ile mock ürünü buluyor.
- Ürün adı ve fiyat ekranda gösteriliyor.
- QR Albüm fiyat göstermiyor.

## İleriki hedef

Mock ürün okuma fonksiyonu korunur ama ileride price provider mantığına ayrılır.

Önerilen soyutlama:

```ts
getProductPriceByCode(code: string): Promise<ProductLookupResult>
```

## İlk gerçek servis geçişi

1. Mock fonksiyon mevcut kalır.
2. Gerçek servis opsiyonel hale gelir.
3. Servis cevap vermezse uygulama çökmez.
4. Ürün bulunamazsa kullanıcıya net uyarı verilir.
5. Fiyat boşsa fişe ekleme kilitlenebilir veya uyarı verilir.

## Risk sınırı

Bu geçiş canlı veri yazma içermez. Sadece okuma yapılır.

## Sonraki kod adımı

Önce config ve servis sözleşmesi netleşmeli. Sonra services/api.ts içinde mock provider ve remote provider ayrımı yapılmalıdır.
