# Android Network Security Config v4.4.3

## Sorun

Honeywell Chrome `http://192.168.1.45:8787/health` ve `http://192.168.1.45:8787/product-price?code=0000051461011` adreslerine erişebildiği halde APK içindeki React Native `fetch` çağrısı `Network request failed` hatasına düşüyordu.

`usesCleartextTraffic: true` tek başına yeterli olmayabildiği için Android native network security config build sürecine eklendi.

## Expo Config Plugin

`plugins/withAndroidNetworkSecurityConfig.js` build sırasında şunları yapar:

- `android/app/src/main/res/xml/network_security_config.xml` dosyasını oluşturur.
- `AndroidManifest.xml` içindeki application alanına `android:usesCleartextTraffic="true"` ekler.
- `AndroidManifest.xml` içindeki application alanına `android:networkSecurityConfig="@xml/network_security_config"` ekler.

## Oluşturulan XML

```xml
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">192.168.1.45</domain>
  </domain-config>
</network-security-config>
```

Android network security config IP range desteklemediği için saha PC adresi açıkça `192.168.1.45` olarak yazıldı. PC IP adresi değişirse plugin içindeki domain değeri de güncellenmelidir.

## Beklenen Sonuç

APK içinde şu adreslere HTTP erişimi açık olmalıdır:

- `http://192.168.1.45:8787/health`
- `http://192.168.1.45:8787/product-price?code=0000051461011`

## Hata Mesajı

Uygulama `Network request failed` alırsa hata mesajı artık Android cleartext/LAN erişim ihtimalini ayrıca belirtir.
