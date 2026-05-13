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
npm run export:web
```

Bu komut Expo Web çıktısını GitHub Pages için üretir.

## Kontrol zamanı

v0.8.4 sonrası Web Preview workflow'unu yeniden tetiklemek için bu not güncellendi.

## Not

Web preview, Honeywell barkod okuyucu davranışını birebir test etmez. Görsel akış ve mock ekran kontrolü içindir.
