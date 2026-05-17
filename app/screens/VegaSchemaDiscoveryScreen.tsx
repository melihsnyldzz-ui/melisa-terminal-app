import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { colors, radius, spacing, typography } from '../theme';

type VegaSchemaDiscoveryScreenProps = {
  onBack: () => void;
};

type DiscoveryTone = 'success' | 'warning' | 'danger';

type DiscoveryTarget = {
  id: string;
  title: string;
  purpose: string;
  expected: string;
  status: string;
  tone: DiscoveryTone;
};

const schemaDiscoveryEndpointAvailable = false;

const targets: DiscoveryTarget[] = [
  {
    id: 'sale-header-table',
    title: 'Satış fişi başlık tablosu',
    purpose: 'Fişin müşteri, evrak no, tarih ve genel toplam bilgisini taşıyacak ana tablo.',
    expected: 'Tablo adı, primary key, evrak no ve tarih kolonları',
    status: 'Keşif bekliyor',
    tone: 'warning',
  },
  {
    id: 'sale-line-table',
    title: 'Satış fişi satır tablosu',
    purpose: 'Fişteki ürün satırlarını, miktar ve fiyat bilgisini taşıyacak tablo.',
    expected: 'Tablo adı, başlık bağlantısı, stok, miktar, fiyat kolonları',
    status: 'Keşif bekliyor',
    tone: 'warning',
  },
  {
    id: 'customer-field',
    title: 'Müşteri / cari alanı',
    purpose: 'Fişin hangi müşteriye ait olduğunu doğru cari kayda bağlamak.',
    expected: 'Cari kodu, cari id veya müşteri referans kolonu',
    status: 'Net değil',
    tone: 'danger',
  },
  {
    id: 'stock-barcode-field',
    title: 'Stok kodu / barkod alanı',
    purpose: 'Okutulan ürünün Vega stok kaydıyla eşleşmesini sağlamak.',
    expected: 'Stok kodu, barkod, stok id veya ürün referans kolonu',
    status: 'Fiyat okuma tarafında adaylar var',
    tone: 'warning',
  },
  {
    id: 'quantity-field',
    title: 'Adet alanı',
    purpose: 'Satış satırındaki miktarı Vega’nın beklediği formatta yazmak.',
    expected: 'Miktar/adet kolonu ve ondalık hassasiyeti',
    status: 'Keşif bekliyor',
    tone: 'warning',
  },
  {
    id: 'price-field',
    title: 'Fiyat alanı',
    purpose: 'Satır birim fiyatı ve toplam tutarı doğru kolonlara taşımak.',
    expected: 'Birim fiyat, satır toplamı, iskonto/KDV ilişkisi',
    status: 'Fiyat okuma için alan biliniyor, yazma alanı onaylı değil',
    tone: 'warning',
  },
  {
    id: 'currency-field',
    title: 'Para birimi alanı',
    purpose: 'TRY / USD / EUR bilgisinin Vega tarafında nasıl tutulacağını netleştirmek.',
    expected: 'Para birimi kodu, kur veya döviz referans kolonu',
    status: 'Keşif bekliyor',
    tone: 'warning',
  },
  {
    id: 'date-document-field',
    title: 'Tarih / evrak no alanları',
    purpose: 'Fiş numarası ve işlem tarihinin Vega kurallarına uygun yazılması.',
    expected: 'Evrak no, belge tarihi, kayıt zamanı ve seri alanları',
    status: 'Keşif bekliyor',
    tone: 'warning',
  },
];

export function VegaSchemaDiscoveryScreen({ onBack }: VegaSchemaDiscoveryScreenProps) {
  const summary = useMemo(() => ({
    ready: targets.filter((target) => target.tone === 'success').length,
    waiting: targets.filter((target) => target.tone === 'warning').length,
    missing: targets.filter((target) => target.tone === 'danger').length,
  }), []);

  return (
    <ScreenShell title="Vega Kolon Keşfi" subtitle="Tablo/kolon hazırlığı" onBack={onBack}>
      <View style={styles.noticePanel}>
        <View style={styles.noticeTop}>
          <View style={styles.noticeTextBlock}>
            <Text style={styles.kicker}>READ-ONLY HAZIRLIK</Text>
            <Text style={styles.noticeTitle}>Bu ekran sadece tablo/kolon keşfi içindir, veri yazmaz.</Text>
          </View>
          <StatusPill label="Yazma yok" tone="success" />
        </View>
        <Text style={styles.noticeText}>INSERT, UPDATE, DELETE, stok düşme, cari hareket veya otomatik satış fişi oluşturma işlemi yoktur. Şimdilik keşif hedefleri listelenir; güvenli endpoint hazır olunca read-only sonuçlar buraya bağlanabilir.</Text>
      </View>

      <View style={styles.endpointPanel}>
        <View style={styles.endpointTextBlock}>
          <Text style={styles.endpointTitle}>Schema discovery endpoint</Text>
          <Text style={styles.endpointText}>
            {schemaDiscoveryEndpointAvailable
              ? 'Güvenli read-only schema endpoint kullanılabilir.'
              : 'Endpoint hazır değil. Mevcut yapı CLI discovery scriptleri ve lokal raporlarla sınırlı.'}
          </Text>
        </View>
        <StatusPill label={schemaDiscoveryEndpointAvailable ? 'Hazır' : 'Hazır değil'} tone={schemaDiscoveryEndpointAvailable ? 'success' : 'warning'} />
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Hazır" value={summary.ready.toString()} tone="success" />
        <InfoBox label="Keşif bekliyor" value={summary.waiting.toString()} tone="warning" />
        <InfoBox label="Eksik/net değil" value={summary.missing.toString()} tone="danger" />
      </View>

      <View style={styles.targetList}>
        {targets.map((target) => (
          <View key={target.id} style={[styles.targetCard, target.tone === 'success' && styles.targetSuccess, target.tone === 'warning' && styles.targetWarning, target.tone === 'danger' && styles.targetDanger]}>
            <View style={styles.targetTextBlock}>
              <Text style={styles.targetTitle}>{target.title}</Text>
              <Text style={styles.targetPurpose}>{target.purpose}</Text>
              <View style={styles.expectedBox}>
                <Text style={styles.expectedLabel}>Aranacak bilgi</Text>
                <Text style={styles.expectedText}>{target.expected}</Text>
              </View>
            </View>
            <StatusPill label={target.status} tone={target.tone} />
          </View>
        ))}
      </View>

      <View style={styles.safeNextBox}>
        <Text style={styles.safeNextTitle}>Güvenli sonraki adım</Text>
        <Text style={styles.safeNextText}>Local price service tarafında ayrı, read-only bir schema endpoint tasarlanmalı. Endpoint sadece INFORMATION_SCHEMA okuyan GET isteği olmalı; yazma kelimeleri ve canlı write-back kapısı fail-closed kalmalı.</Text>
      </View>
    </ScreenShell>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone: DiscoveryTone }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'success' && styles.textSuccess, tone === 'warning' && styles.textWarning, tone === 'danger' && styles.textDanger]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticePanel: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#bce7c8',
    borderLeftColor: colors.success,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noticeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  noticeTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  noticeTitle: { color: colors.success, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  noticeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  endpointPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#efd5a7',
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  endpointTextBlock: { flex: 1, gap: 2 },
  endpointTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  endpointText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', gap: spacing.xs },
  infoBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  targetList: { gap: spacing.xs },
  targetCard: {
    minHeight: 86,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  targetSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  targetWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  targetDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  targetTextBlock: { flex: 1, gap: 3 },
  targetTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  targetPurpose: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  expectedBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  expectedLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  expectedText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  safeNextBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  safeNextTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  safeNextText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  textSuccess: { color: colors.success },
  textWarning: { color: colors.amber },
  textDanger: { color: colors.red },
});
