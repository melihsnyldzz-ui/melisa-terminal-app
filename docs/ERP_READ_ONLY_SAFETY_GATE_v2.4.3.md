# v2.4.3 ERP Read Only Safety Gate

## Amaç

ERP entegrasyonunda ilk fazın sadece okuma ile sınırlı kalmasını garanti altına almak.

## İzin verilenler

- Barkod ile ürün arama
- Ürün adı okuma
- Birim fiyat okuma
- Terminal ekranında fiyat gösterme

## İzin verilmeyenler

- Canlı fiş oluşturma
- Stok düşme
- ERP kaydı yazma
- Fatura veya irsaliye oluşturma
- Tahsilat veya bakiye işlemi
- Müşteri finans bilgisi değiştirme

## Kabul kriteri

İlk ERP fazı sadece barkoddan fiyat okuma amacıyla kullanılmalıdır.

## Sonraki karar

Fiyat okuma stabil hale gelmeden canlı yazma fazına geçilmez.
