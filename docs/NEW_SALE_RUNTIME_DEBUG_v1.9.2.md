# v1.9.2 New Sale Runtime Debug Guide

## Amac

Yeni Fis ekraninda Web Preview uzerinde beyaz ekran devam ederse hangi bilgilerin alinacagini belirlemek.

## Gerekli bilgiler

- Web Preview linkindeki gorunen surum
- Login sonrasi Dashboard aciliyor mu?
- Ayarlar ekrani aciliyor mu?
- Aktif Taslagi Sifirla butonu gorunuyor mu?
- Butona basinca mesaj cikiyor mu?
- Yeni Fis ekranina basinca tamamen beyaz mi, yoksa hata mesaji var mi?

## Local log gerektiren durum

Asagidaki durumda GitHub uzerinden tahminle devam edilmemeli, local log veya Codex/local build devreye alinmalidir:

- Ayarlar aciliyor
- Aktif taslak sifirlaniyor
- Buna ragmen Yeni Fis beyaz ekranda kaliyor

## Kontrol komutlari

```powershell
npm run check
npm run preview:honeywell
```

## Not

Bu rehber, runtime hatayi tahmin etmek yerine gorunen semptoma gore sonraki dogru adimi secmek icindir.
