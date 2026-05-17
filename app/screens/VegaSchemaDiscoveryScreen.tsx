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
type SchemaReadinessStatus = 'ready' | 'missing' | 'noConnection' | 'unknown';

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

function getTargetByKey(result: VegaSchemaDiscoveryResult | null, key: string) {
  return result?.targets.find((target) => target.key === key) || null;
}

function getMissingColumns(target: ReturnType<typeof getTargetByKey>) {
  return target?.importantColumns.filter((column) => !column.exists).map((column) => column.name) || [];
}

function getReadinessStatus(result: VegaSchemaDiscoveryResult | null): SchemaReadinessStatus {
  if (!result) return 'unknown';

  const detail = `${result.message} ${result.reason || ''}`.toLocaleLowerCase('tr-TR');
  if (!result.ok && (detail.includes('bağlantısı yok') || detail.includes('ulaşılamıyor') || detail.includes('geçersiz') || detail.includes('ağ bağlantısı'))) {
    return 'noConnection';
  }

  const header = getTargetByKey(result, 'saleHeader');
  const line = getTargetByKey(result, 'saleLine');
  const headerReady = Boolean(header?.exists) && getMissingColumns(header).length === 0;
  const lineReady = Boolean(line?.exists) && getMissingColumns(line).length === 0;

  return headerReady && lineReady ? 'ready' : 'missing';
}

function getReadinessMeta(status: SchemaReadinessStatus) {
  if (status === 'ready') {
    return {
      label: 'Hazır',
      tone: 'success' as const,
      title: 'Satış yazmaya hazır mı?',
      message: 'Temel başlık ve satır tabloları ile gerekli kolonlar hazır görünüyor.',
      decision: 'Canlı yazmaya yaklaşmadan önce yine de şirket ortamında test DB ile doğrula.',
    };
  }

  if (status === 'missing') {
    return {
      label: 'Eksik var',
      tone: 'danger' as const,
      title: 'Satış yazmaya hazır mı?',
      message: 'Satış yazmaya hazır değil. Eksik tablo veya gerekli kolon var.',
      decision: 'Eksikler tamamlanmadan write-back açılmamalı.',
    };
  }

  if (status === 'noConnection') {
    return {
      label: 'Vega bağlantısı yok',
      tone: 'warning' as const,
      title: 'Satış yazmaya hazır mı?',
      message: 'Şu an Vega bağlantısı yok, şirket ortamında tekrar kontrol et.',
      decision: 'Bağlantı doğrulanmadan tablo/kolon kararı verilmemeli.',
    };
  }

  return {
    label: 'Kontrol edilemedi',
    tone: 'warning' as const,
    title: 'Satış yazmaya hazır mı?',
    message: 'Schema sonucu henüz okunmadı veya kontrol tamamlanmadı.',
    decision: 'Endpoint kontrolünü yenile.',
  };
}

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
  const headerTarget = getTargetByKey(discoveryResult, 'saleHeader');
  const lineTarget = getTargetByKey(discoveryResult, 'saleLine');
  const readinessStatus = getReadinessStatus(discoveryResult);
  const readinessMeta = getReadinessMeta(readinessStatus);
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

      <View style={[styles.readinessPanel, readinessMeta.tone === 'success' && styles.readinessSuccess, readinessMeta.tone === 'warning' && styles.readinessWarning, readinessMeta.tone === 'danger' && styles.readinessDanger]}>
        <View style={styles.readinessTop}>
          <View style={styles.readinessTextBlock}>
            <Text style={styles.kicker}>GENEL DURUM</Text>
            <Text style={styles.readinessTitle}>{readinessMeta.title}</Text>
            <Text style={styles.readinessMessage}>{readinessMeta.message}</Text>
          </View>
          <StatusPill label={readinessMeta.label} tone={readinessMeta.tone} />
        </View>
        <Text style={styles.readinessDecision}>{readinessMeta.decision}</Text>
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

      <SchemaTargetSection title="Başlık tablosu" target={headerTarget} />
      <SchemaTargetSection title="Satır tablosu" target={lineTarget} />

      <View style={styles.summaryGrid}>
        <InfoBox label="Hazır" value={summary.ready.toString()} tone="success" />
        <InfoBox label="Keşif bekliyor" value={summary.waiting.toString()} tone="warning" />
        <InfoBox label="Eksik/net değil" value={summary.missing.toString()} tone="danger" />
      </View>

      <View style={styles.detailIntroPanel}>
        <View style={styles.detailIntroTextBlock}>
          <Text style={styles.kicker}>DETAY KOLON LİSTESİ</Text>
          <Text style={styles.detailIntroTitle}>Genel sonuçtan sonra alan bazlı kontrol</Text>
          <Text style={styles.detailIntroText}>Önce yukarıdaki satışa hazır mı sonucuna bak. Detayda hangi tablo veya alanın eksik/net olmadığı tek tek listelenir.</Text>
        </View>
        <StatusPill label="Detay" tone="info" />
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

function SchemaTargetSection({ title, target }: { title: string; target: ReturnType<typeof getTargetByKey> }) {
  const missingColumns = getMissingColumns(target);
  const requiredCount = target?.importantColumns.length || 0;
  const foundCount = requiredCount - missingColumns.length;
  const tableTone: DiscoveryTone = target?.exists && missingColumns.length === 0 ? 'success' : target?.exists ? 'warning' : 'danger';
  const tableLabel = target?.exists ? 'Tablo var' : 'Tablo yok';
  const columnLabel = target?.exists && missingColumns.length === 0 ? 'Kolonlar tamam' : 'Eksik kolon var';

  return (
    <View style={[styles.schemaSection, tableTone === 'success' && styles.targetSuccess, tableTone === 'warning' && styles.targetWarning, tableTone === 'danger' && styles.targetDanger]}>
      <View style={styles.schemaSectionTop}>
        <View style={styles.schemaTitleBlock}>
          <Text style={styles.schemaTitle}>{title}</Text>
          <Text style={styles.schemaTableName}>{target ? `${target.schema}.${target.table}` : 'Sonuç bekleniyor'}</Text>
        </View>
        <StatusPill label={tableLabel} tone={tableTone} />
      </View>

      <View style={styles.schemaFacts}>
        <InfoBox label="Toplam kolon" value={(target?.columnCount || 0).toString()} tone={target?.exists ? 'success' : 'danger'} />
        <InfoBox label="Gerekli kolon" value={`${foundCount}/${requiredCount}`} tone={missingColumns.length === 0 && target?.exists ? 'success' : 'warning'} />
      </View>

      <View style={styles.expectedBox}>
        <Text style={styles.expectedLabel}>{columnLabel}</Text>
        <Text style={styles.expectedText}>
          {target?.exists
            ? missingColumns.length > 0
              ? `Eksik: ${missingColumns.join(', ')}`
              : 'Gerekli kolonlar tamam görünüyor.'
            : 'Tablo bulunmadan kolon doğrulanamaz.'}
        </Text>
      </View>
    </View>
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
  readinessPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  readinessSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  readinessWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  readinessDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  readinessTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  readinessTextBlock: { flex: 1, gap: 2 },
  readinessTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900', lineHeight: 18 },
  readinessMessage: { color: colors.text, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  readinessDecision: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
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
  schemaSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  schemaSectionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  schemaTitleBlock: { flex: 1, gap: 2 },
  schemaTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  schemaTableName: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  schemaFacts: { flexDirection: 'row', gap: spacing.xs },
  summaryGrid: { flexDirection: 'row', gap: spacing.xs },
  detailIntroPanel: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailIntroTextBlock: { flex: 1, gap: 2 },
  detailIntroTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  detailIntroText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
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
