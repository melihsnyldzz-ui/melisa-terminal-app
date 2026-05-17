# Web Preview Troubleshooting

## Doğru başlatma komutu

```powershell
npm run web:fresh
```

Bu komut Expo Web'i 8002 portunda ve cache temizleyerek başlatır:

```powershell
expo start --web --port 8002 --clear
```

Windows'ta çift tıklamak için:

```powershell
start-web-fresh.bat
```

## Doğru adres

```text
http://localhost:8002/
```

GitHub Pages yolu test edilecekse ayrıca şu adres denenebilir:

```text
http://localhost:8002/melisa-terminal-app/
```

## Eski versiyon görünürse

1. Terminalde çalışan eski Expo/Metro sürecini `Ctrl + C` ile kapat.
2. Tekrar başlat:

```powershell
npm run web:fresh
```

3. Chrome'da hard refresh yap:
   - `Ctrl + Shift + R`
   - DevTools açıksa reload tuşuna sağ tıkla, `Empty Cache and Hard Reload` seç.

## Port notu

Bu proje için local web preview portu `8002` kabul edildi. Aynı anda 8082 veya 19006 üzerinde eski Expo süreci açık kalırsa yanlış sekme eski ekranı gösterebilir.
