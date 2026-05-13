# v2.3.4 Barcode Focus Stabilization Plan

## Hedef

Honeywell cihazda Yeni Fis ekranindaki barkod ve adet giris davranisini net test etmek.

## Mevcut beklenen akis

1. Yeni Fis ekrani acilir.
2. Musteri secilir.
3. Fis baslatilir.
4. Barkod alani focus alir.
5. Scanner kodu barkod alanina basar.
6. Urun bulunur ve fiyat karti gorunur.
7. Adet alani secilir.
8. Adet girilir.
9. Urun fise eklenir.
10. Urun eklendikten sonra barkod alanina geri donulur.

## Honeywell testinde bakilacaklar

- Barkod alani fis baslatilinca otomatik focus aliyor mu?
- Scanner okutunca kod alana dusuyor mu?
- Scanner sonrasi gereksiz soft keyboard aciliyor mu?
- Fiyat karti okunabilir mi?
- Adet alanina gecis kolay mi?
- Urun fise eklenince barkod alanina geri donuyor mu?
- Ayni barkod hizli okutulunca tekrar korumasi calisiyor mu?

## Kod degisikligi karari

Bu pakette Yeni Fis koduna yeni patch uygulanmadi. Cihazdaki gercek davranis gorulduktan sonra asagidaki kucuk patchler degerlendirilecek:

- Barkod alaninda soft keyboard kapatma.
- Urun eklendikten sonra barkod focus gecikmesini ayarlama.
- Adet girisinden sonra Enter ile fise ekleme.
- Fiyat kartini daha buyuk ve daha okunur hale getirme.

## Kabul kriteri

Satici cihazla barkod okutup fiyat gorup adet girerek urunu fise ekleyebilmelidir.
