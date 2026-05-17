# GitHub Pages Deploy Notu

Canli adres:

```text
https://melihsnyldzz-ui.github.io/melisa-terminal-app/
```

## Base path

GitHub Pages proje adresi icin Expo base path:

```text
/melisa-terminal-app/
```

Bu ayar `app.json` icindeki `expo.experiments.baseUrl` alanindan gelir.

## Local web build

```powershell
npm run check
npm run export:web
node scripts/postprocess-web-export.mjs
```

`postprocess-web-export.mjs` build sonrasinda `dist/index.html` icine cache azaltici meta alanlari ekler, `dist/build-info.json` olusturur ve GitHub Pages icin `.nojekyll` dosyasini yazar.

## GitHub Pages deploy

`main` branch'e push sonrasi `.github/workflows/web-preview.yml` calisir:

```text
npm ci
npm run check
npm run export:web
node scripts/postprocess-web-export.mjs
actions/deploy-pages
```

Bu bilgisayardan push/pull yapilmadan once local commit hazir olmalidir.

## Cache kontrolu

GitHub Pages HTML icin kisa sureli cache uygulayabilir. Deploy tamamlandiktan sonra eski ekran gorunurse:

1. Sayfayi `Ctrl + F5` ile yenile.
2. Gerekirse su adresle cache bypass yap:

```text
https://melihsnyldzz-ui.github.io/melisa-terminal-app/?v=5.12.2
```

3. Build bilgisini kontrol et:

```text
https://melihsnyldzz-ui.github.io/melisa-terminal-app/build-info.json
```

Beklenen `version` degeri ekrandaki `v5.12.2` etiketiyle ayni olmalidir.
