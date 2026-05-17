import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { checkVegaSchemaDiscovery } from '../../services/api';
import type { VegaSchemaDiscoveryResult } from '../../services/api';
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
  const [discoveryResult, setDiscoveryResult] = useState<VegaSchemaDiscoveryResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'warning' } | null>(null);

  const refreshDiscovery = async () => {
    setChecking(true);
    const result = await checkVegaSchemaDiscovery();
    setDiscoveryResult(result);
    setChecking(false);
    setBanner({
      message: result.ok ? 'Schema discovery sonucu okundu. Veri yazılmadı.' : result.message,
      tone: result.ok ? 'success' : 'warning',
    });
  };

  useEffect(() => {
    void refreshDiscovery();
  }, []);

  const endpointAvailable = Boolean(discoveryResult);
  const resultTargets = discoveryResult?.targets || [];
  const targetStatusByKey = useMemo(() => new Map(resultTargets.map((target) => [target.key, target])), [resultTargets]);
  const visibleTargets = targets.map((target) => {
    const resultTarget = target.id === 'sale-header-table'
      ? targetStatusByKey.get('saleHeader')
      : target.id === 'sale-line-table'
        ? targetStatusByKey.get('saleLine')
        : null;
    if (!resultTarget) return target;
    return {
      ...target,
      status: resultTarget.exists ? `${resultTarget.columnCount} kolon` : 'Tablo yok',
      tone: resultTarget.exists ? 'success' as const : 'danger' as const,
      expected: `${target.expected}. Önemli kolonlar: ${resultTarget.importantColumns.map((column) => `${column.name} ${column.exists ? 'var' : 'yok'}`).join(', ')}`,
    };
  });
  const summary = useMemo(() => ({
    ready: visibleTargets.filter((target) => target.tone === 'success').length,
    waiting: visibleTargets.filter((target) => target.tone === 'warning').length,
    missing: visibleTargets.filter((target) => target.tone === 'danger').length,
  }), [visibleTargets]);

  return (
    <ScreenShell title="Vega Kolon Keşfi" subtitle="Tablo/kolon hazırlığı" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

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
            {checking
              ? 'Endpoint kontrol ediliyor.'
              : endpointAvailable
                ? `${discoveryResult?.message || 'Schema discovery sonucu alındı.'} ${discoveryResult?.reason || ''}`.trim()
                : 'Endpoint sonucu henüz alınmadı.'}
          </Text>
          <Text style={styles.endpointText}>Adres: {discoveryResult ? `${discoveryResult.url}${discoveryResult.endpoint}` : '/api/vega/schema-discovery'}</Text>
          <Text style={styles.endpointText}>İlişki notu: {discoveryResult?.relationshipNote || 'header.IND = line.EVRAKNO'}</Text>
        </View>
        <StatusPill label={checking ? 'Kontrol' : discoveryResult?.ok ? 'Hazır' : 'Hazır değil'} tone={checking ? 'warning' : discoveryResult?.ok ? 'success' : 'warning'} />
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Hazır" value={summary.ready.toString()} tone="success" />
        <InfoBox label="Keşif bekliyor" value={summary.waiting.toString()} tone="warning" />
        <InfoBox label="Eksik/net değil" value={summary.missing.toString()} tone="danger" />
      </View>

      <View style={styles.targetList}>
        {visibleTargets.map((target) => (
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
        <Text style={styles.safeNextText}>{discoveryResult?.safetyMessage || 'Endpoint sadece INFORMATION_SCHEMA okuyan GET isteği olmalı; yazma kelimeleri ve canlı write-back kapısı fail-closed kalmalı.'}</Text>
      </View>

      <AppButton label={checking ? 'Kontrol Ediliyor' : 'Endpoint’i Yenile'} onPress={refreshDiscovery} variant="secondary" compact />
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
