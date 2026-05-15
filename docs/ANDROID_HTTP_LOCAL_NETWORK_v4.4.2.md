# Android HTTP Local Network v4.4.2

## Sorun

Honeywell Chrome `http://192.168.1.45:8787` adresine erişebildiği halde APK içindeki React Native `fetch` çağrısı `Network request failed` hatasına düşebilir.

Bu durum Android cleartext HTTP policy nedeniyle oluşur. Android uygulamaları varsayılan olarak düz `http://` trafiğini engelleyebilir.

## Hotfix

`app.json` Android yapılandırmasına şu alan eklendi:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

Bu ayar local LAN içindeki HTTP fiyat servisine erişimi APK build içinde açık hale getirir.

## Test Adresi

```text
http://192.168.1.45:8787
```

Beklenen kontroller:

- `http://192.168.1.45:8787/health` cevap verir.
- `http://192.168.1.45:8787/product-price?code=0000051461011` ürün ve fiyat döndürür.
- APK içinde Ayarlar > Bağlantıyı Kontrol Et başarılı olur.
- Yeni Fiş ekranında barkod okutunca ürün adı, fiyat ve para birimi görünür.

## Güvenlik

Bu hotfix yalnızca Android uygulamasının local HTTP servisine erişmesine izin verir. Veri yazma, import, export veya sync işlemi eklemez.
