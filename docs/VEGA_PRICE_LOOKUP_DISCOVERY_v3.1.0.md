# Vega Price Lookup Discovery v3.1.0

Bu doküman `local-price-service` için Vega SQL tablo/kolon keşfi tamamlanana kadar güvenli hazırlık notudur. Gerçek tablo adı, kolon adı veya fiyat listesi kuralı kesinleşmiş kabul edilmez.

## Amaç

Terminal uygulaması barkod veya stok kodu gönderdiğinde local Windows servisi read-only fiyat cevabı dönebilmelidir. v3.1.0 aşamasında hedef, gerçek sorguyu yazmak değil; gerekli alanları ve doğrulama kararlarını netleştirmektir.

## Aday Alanlar

### Barkod kolonu

- Barkod okuyucudan gelen değerle birebir eşleşecek alan bulunmalıdır.
- Aynı barkodun birden fazla ürün veya birim satırına bağlanıp bağlanmadığı kontrol edilmelidir.
- Barkod alanı boş, eski veya pasif ürün satırlarında varsa filtre kuralı ayrıca belirlenmelidir.

### Stok kodu kolonu

- Terminal ekranında `code` olarak dönecek stok kodu alanı seçilmelidir.
- Barkod tablosu ayrıysa stok kartı tablosuyla ilişki kolonu doğrulanmalıdır.
- Stok kodu ile barkodun bire çok veya çoklu birim ilişkisi olup olmadığı not edilmelidir.

### Ürün adı kolonu

- Terminal ekranında `name` olarak dönecek açıklama/ürün adı alanı seçilmelidir.
- Ürün adı boşsa kullanılacak yedek açıklama alanı belirlenmelidir.
- Kısa ad, uzun ad veya fiş açıklaması ayrımı varsa tercih kuralı yazılmalıdır.

### Satış fiyatı kolonu

- Terminal ekranında `price` olarak dönecek satış fiyatı alanı belirlenmelidir.
- KDV dahil/hariç ayrımı ve para birimi kuralı netleşmelidir.
- Fiyat listesi, kampanya veya şube fiyatı varsa hangi fiyatın terminale döneceği ayrıca onaylanmalıdır.

### Aktif/pasif ürün filtresi

- Pasif, silinmiş, satışa kapalı veya stok dışı ürünleri ayıracak alan araştırılmalıdır.
- Filtre yoksa servis yalnızca bulunan ürünü döndürür; karar terminal tarafında verilmez.
- Aktiflik kuralı kesinleşmeden demo mod kapatılmamalıdır.

### Fiyat listesi / depo / şube ayrımı

- Aynı ürün farklı depo, şube veya fiyat listesinde farklı fiyat taşıyorsa seçim kuralı belirlenmelidir.
- Terminal ayarlarındaki şube/depo bilgisinin fiyat sorgusuna katılıp katılmayacağı ayrıca kararlaştırılmalıdır.
- Varsayılan fiyat listesi yoksa SQL sorgusu tek fiyat döndürmeye zorlanmamalıdır.

## Güvenli Sorgu Hazırlığı

`local-price-service` gerçek tablo adı kesinleşene kadar `.env` içinde `DEMO_MODE=true` ile çalışmalıdır. `DEMO_MODE=false` yapılırsa `SQL_PRICE_QUERY` tanımlı olmalıdır; tanımlı değilse servis şu güvenli cevabı döndürür:

```json
{
  "found": false,
  "message": "SQL_PRICE_QUERY tanımlı değil"
}
```

Placeholder sorgu örneği:

```sql
SELECT TOP (1)
  CAST(<stok_kodu_kolonu> AS nvarchar(80)) AS code,
  CAST(<urun_adi_kolonu> AS nvarchar(255)) AS name,
  CAST(<satis_fiyati_kolonu> AS decimal(18, 2)) AS price
FROM <vega_urun_veya_barkod_tablosu>
WHERE <barkod_veya_stok_kodu_kolonu> = @code
  AND <aktif_urun_filtresi>
```

## Kabul Kriteri

- Sorgu parametreli kalır ve `@code` kullanır.
- Gerçek tablo/kolon adı dokümante edilmeden demo mod kapatılmaz.
- SQL hatasında servis çökmez; JSON hata cevabı döner.
- Keşif tamamlanana kadar import, export, sync veya veri yazma akışı eklenmez.
