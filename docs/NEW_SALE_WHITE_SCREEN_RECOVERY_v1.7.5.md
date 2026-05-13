# v1.7.5 New Sale White Screen Recovery

## Amac

Yeni Fis ekraninda eski veya bozuk local taslak nedeniyle olusabilecek beyaz ekran riskini azaltmak.

## Yapilan stabilizasyon

- Local storage okuma islemi guvenli hale getirildi.
- Bozuk JSON kaydi varsa uygulama cokmeden kayit temizlenir.
- Aktif satis taslagi yuklenirken fiyat ve adet degerleri normalize edilir.
- Fiyat yoksa 0 atanir.
- Adet yoksa 1 atanir.

## Beklenen sonuc

Yeni Fis ekrani eski taslaklardan dolayi beyaz ekrana dusmeden acilmalidir.

## Hala sorun olursa

Tarayici local storage temizlenmeli veya uygulamaya taslak sifirlama butonu eklenmelidir.
