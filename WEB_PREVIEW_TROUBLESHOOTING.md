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

1. Eski Expo/Metro terminal pencerelerini `Ctrl + C` ile kapat. Aynı anda birden fazla preview açık kalmasın.
2. 8002 dışında açık eski sekmeler varsa kapat veya doğru adrese dön.
3. Tekrar başlat:

```powershell
npm run web:fresh
```

4. Chrome'da hard refresh yap:
   - `Ctrl + Shift + R`
   - DevTools açıksa reload tuşuna sağ tıkla, `Empty Cache and Hard Reload` seç.

## Port kontrolü

Windows PowerShell'de hangi preview sürecinin portu tuttuğunu görmek için:

```powershell
Get-NetTCPConnection -LocalPort 8002,8082,19006 -ErrorAction SilentlyContinue
```

Bu proje için beklenen port `8002` olmalı. 8082 veya 19006 eski bir denemeden kalmışsa yanlış tarayıcı sekmesi eski ekranı gösterebilir.

## Eski terminal pencereleri kapanmalı mı?

Evet. Kod değiştiği halde ekran değişmiyorsa önce eski Expo/Metro pencerelerini kapat. Sonra tek bir terminalden `npm run web:fresh` çalıştır. Böylece Metro cache temizlenir ve doğru porttan yeni bundle hazırlanır.

## Port notu

Bu proje için local web preview portu `8002` kabul edildi. Günlük geliştirmede ana adres `http://localhost:8002/` olmalı.
