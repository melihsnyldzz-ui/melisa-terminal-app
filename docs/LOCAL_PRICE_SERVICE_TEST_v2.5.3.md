# v2.5.3 Local Price Service Test Plan

## Amaç

Local ağdaki fiyat okuma servisinin terminalden erişilebilir olduğunu test etmek.

## Test öncesi

- Servis çalışacak PC local ağda olmalı.
- PC IP adresi sabitlenmeli.
- Honeywell terminal aynı Wi-Fi veya aynı local ağda olmalı.
- Servis portu Windows Firewall tarafından engellenmemeli.

## Örnek test adresi

```text
http://192.168.1.50:8787/product-price?code=MB-1001
```

## PC üzerinde test

Tarayıcıdan veya PowerShell ile servis denenir.

```powershell
curl "http://localhost:8787/product-price?code=MB-1001"
```

## Aynı ağdaki başka cihazdan test

```powershell
curl "http://192.168.1.50:8787/product-price?code=MB-1001"
```

## Honeywell üzerinden test

- Honeywell tarayıcısında servis URL'i açılır.
- JSON cevabı geliyor mu kontrol edilir.
- Sonra terminal uygulamasında aynı endpoint kullanılacak şekilde config hazırlanır.

## Kabul kriteri

- Servis PC üzerinde cevap verir.
- Aynı ağdaki cihazdan cevap verir.
- Honeywell cihazdan cevap verir.
- Ürün bulunursa ad ve fiyat döner.
- Ürün bulunamazsa uygulama çökmeden uyarı verilir.
