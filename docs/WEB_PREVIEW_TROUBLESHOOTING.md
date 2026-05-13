# Web Preview Troubleshooting

## Beklenen adres

https://melihsnyldzz-ui.github.io/melisa-terminal-app/

## 404 görülürse

1. GitHub repository ayarlarından Pages bölümüne girin.
2. Source alanının GitHub Actions olduğundan emin olun.
3. Actions sekmesinde Web Preview workflow sonucunu kontrol edin.
4. Workflow tamamlanmadan link 404 verebilir.
5. Private repository ve hesap planı GitHub Pages yayınını kısıtlayabilir.

## Bu repoda kullanılan web export

```powershell
npm run export:web
```

Bu komut Expo Web çıktısını GitHub Pages altında `/melisa-terminal-app/` yolu ile çalışacak şekilde üretir.

## Kontrol zamanı

Workflow tetiklemek ve Pages durumunu yeniden kontrol etmek için bu not güncellendi.

## Not

Web preview, Honeywell barkod okuyucu davranışını birebir test etmez. Görsel akış ve mock ekran kontrolü içindir.
