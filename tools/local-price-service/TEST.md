# v2.6.3 Local Price Service Test Guide

## Çalıştırma

Proje kökünden:

```powershell
node tools/local-price-service/server.mjs
```

## PC üzerinde health check

```powershell
curl "http://localhost:8787/health"
```

Beklenen cevap:

```json
{"ok":true,"service":"local-price-service","mode":"mock"}
```

## PC üzerinde ürün fiyat testi

```powershell
curl "http://localhost:8787/product-price?code=MB-1001"
```

Beklenen cevap:

```json
{"found":true,"code":"MB-1001","name":"Bebek Takım","price":485}
```

## Honeywell veya başka cihazdan test

PC'nin local IP adresini bul:

```powershell
ipconfig
```

Sonra aynı ağdaki cihazdan şu adresi aç:

```text
http://PC_IP_ADRESI:8787/product-price?code=MB-1001
```

Örnek:

```text
http://192.168.1.50:8787/product-price?code=MB-1001
```

## Windows Firewall notu

Honeywell cihaz servis adresine ulaşamıyorsa Windows Firewall portu engelliyor olabilir. İlk testte 8787 portuna local ağdan izin verilmelidir.

## Güvenlik notu

Bu servis mock modundadır. ERP/SQL bağlantısı yoktur ve canlı veriye yazmaz.
