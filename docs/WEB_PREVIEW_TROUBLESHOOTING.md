# Web Preview Troubleshooting

## Beklenen adres

https://melihsnyldzz-ui.github.io/melisa-terminal-app/

## 404 veya eski sürüm görülürse

1. GitHub repository ayarlarından Pages bölümüne girin.
2. Source alanının GitHub Actions olduğundan emin olun.
3. Actions sekmesinde Web Preview workflow sonucunu kontrol edin.
4. Workflow tamamlanmadan link 404 verebilir veya eski sürüm görünebilir.
5. Tarayıcı eski dosyaları cache'lemiş olabilir; Ctrl + F5 veya gizli sekme deneyin.

## Bu repoda kullanılan web export

```powershell
npm run check
npm run export:web
node scripts/postprocess-web-export.mjs
```

Bu komutlar Expo Web çıktısını GitHub Pages için üretir ve `dist/index.html` içine cache azaltıcı build metadata ekler.

## Cache bypass

Deploy tamamlandığı halde eski ekran görünürse:

```text
https://melihsnyldzz-ui.github.io/melisa-terminal-app/?v=5.12.2
```

Build bilgisini ayrıca buradan kontrol edin:

```text
https://melihsnyldzz-ui.github.io/melisa-terminal-app/build-info.json
```

## Kontrol zamanı

v5.12.2 sonrası Web Preview workflow'u build metadata ve cache azaltıcı HTML meta alanları üretir.

## Not

Web preview, Honeywell barkod okuyucu davranışını birebir test etmez. Görsel akış ve mock ekran kontrolü içindir.
