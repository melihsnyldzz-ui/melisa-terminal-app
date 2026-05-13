# v2.5.2 Local Price Service Security

## Amaç

Local ağdaki fiyat okuma servisinin güvenlik sınırlarını belirlemek.

## Servis nerede çalışır?

Servis local ağdaki güvenilir bir Windows PC üzerinde çalışır.

## Terminal ne yapar?

- Barkod veya ürün kodu gönderir.
- Ürün adı ve fiyat cevabı bekler.
- Cevabı Yeni Fiş ekranında gösterir.

## Terminal ne yapmaz?

- SQL kullanıcı adı veya şifre tutmaz.
- Doğrudan SQL bağlantısı açmaz.
- ERP verisine yazmaz.
- Stok düşmez.
- Fiş kaydetmez.

## Servis ne yapar?

- ERP/SQL tarafında sadece okuma yapar.
- Sadece gerekli alanları döner.
- Hata durumunda sade hata mesajı döner.

## Servis ne yapmaz?

- Veritabanına yazmaz.
- Stok hareketi oluşturmaz.
- Fiş kaydı oluşturmaz.
- Tahsilat işlemi yapmaz.

## Ağ güvenliği

- Servis sadece local ağdan erişilebilir olmalıdır.
- Servis portu dış internete açılmamalıdır.
- PC IP adresi sabitlenmelidir.
- İlk testte sadece Honeywell cihaz IP aralığına izin verilmesi değerlendirilebilir.

## Kabul kriteri

Fiyat okuma servisi local ağda hızlı ve güvenli çalışmalı, terminalde ERP gizli bilgisi bulunmamalıdır.
