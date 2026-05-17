import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { checkLocalPriceService } from '../../services/api';
import type { LocalPriceConnectionResult } from '../../services/api';
import { loadSettings } from '../../storage/localStorage';
import type { TerminalSettings } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type VegaWriteBackReadinessScreenProps = {
  onBack: () => void;
};

type ReadinessTone = 'success' | 'warning' | 'danger';

type ReadinessCheck = {
  id: string;
  title: string;
  description: string;
  tone: ReadinessTone;
  statusLabel: string;
};

const hasSafeHttpUrl = (value?: string) => /^http:\/\/[^/]+/i.test(String(value || '').trim())
  && !String(value || '').toLocaleLowerCase('tr-TR').includes('localhost')
  && !String(value || '').includes('127.0.0.1');

const formatDate = (value?: string) => {
  if (!value) return 'Henüz kontrol edilmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function VegaWriteBackReadinessScreen({ onBack }: VegaWriteBackReadinessScreenProps) {
  const [settings, setSettings] = useState<TerminalSettings | null>(null);
  const [priceService, setPriceService] = useState<LocalPriceConnectionResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | undefined>(undefined);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'warning' | 'error' } | null>(null);

  const runCheck = async () => {
    setChecking(true);
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings);
    const result = await checkLocalPriceService(loadedSettings);
    setPriceService(result);
    setCheckedAt(new Date().toISOString());
    setChecking(false);
    setBanner({
      message: result.ok ? 'Vega okuma bağlantısı kontrol edildi. Yazma yapılmadı.' : 'Bağlantı tarafında kontrol edilmesi gereken nokta var.',
      tone: result.ok ? 'success' : 'warning',
    });
  };

  useEffect(() => {
    void runCheck();
  }, []);

  const checks = useMemo<ReadinessCheck[]>(() => {
    const apiReady = hasSafeHttpUrl(settings?.apiBaseUrl);
    const liveWriteEnabled = false;
    return [
      {
        id: 'price-service',
        title: 'Fiyat servisi çalışıyor mu?',
        description: checking
          ? 'Local fiyat servisi kontrol ediliyor.'
          : priceService?.ok
            ? 'Local fiyat servisi cevap verdi. Vega fiyat okuma tarafı hazır görünüyor.'
            : priceService?.reason || 'Local fiyat servisi henüz doğrulanmadı.',
        tone: checking ? 'warning' : priceService?.ok ? 'success' : 'danger',
        statusLabel: checking ? 'Kontrol' : priceService?.ok ? 'Hazır' : 'Sorun',
      },
      {
        id: 'vega-connection',
        title: 'Vega bağlantı bilgisi var mı?',
        description: apiReady ? `API adresi tanımlı: ${settings?.apiBaseUrl}` : 'Geçerli PC IPv4 API adresi görülmüyor.',
        tone: apiReady ? 'success' : 'danger',
        statusLabel: apiReady ? 'Var' : 'Eksik',
      },
      {
        id: 'live-write',
        title: 'Canlı yazma kapalı mı?',
        description: liveWriteEnabled ? 'Canlı Vega yazma açık görünüyor. Bu pilot aşamada güvenli değil.' : 'Uygulamada Vega write-back motoru yok; canlı yazma kapalı.',
        tone: liveWriteEnabled ? 'danger' : 'success',
        statusLabel: liveWriteEnabled ? 'Açık' : 'Kapalı',
      },
      {
        id: 'test-db',
        title: 'Test/analiz DB hazır mı?',
        description: 'Uygulama içinde test DB onayı tutulmuyor. Vega yazma öncesi ayrı test DB adı ve yetkisi netleşmeli.',
        tone: 'warning',
        statusLabel: 'Kontrol',
      },
      {
        id: 'sale-header-table',
        title: 'Satış fişi başlık tablo bilgisi var mı?',
        description: 'Başlık tablo adı ve zorunlu kolonlar uygulama içinde onaylı değil.',
        tone: 'danger',
        statusLabel: 'Eksik',
      },
      {
        id: 'sale-line-table',
        title: 'Satış fişi satır tablo bilgisi var mı?',
        description: 'Satır tablo adı, ürün, miktar, fiyat ve para birimi kolonları onaylı değil.',
        tone: 'danger',
        statusLabel: 'Eksik',
      },
      {
        id: 'rollback-mode',
        title: 'Rollback/test modu hazır mı?',
        description: 'Write-back kodu olmadığı için veri yazılmaz. Gerçek aşamada rollback ve test fişi prosedürü ayrıca tanımlanmalı.',
        tone: 'warning',
        statusLabel: 'Plan gerekli',
      },
    ];
  }, [checking, priceService, settings]);

  const hasDanger = checks.some((check) => check.tone === 'danger');
  const hasWarning = checks.some((check) => check.tone === 'warning');

  return (
    <ScreenShell title="Vega Hazırlık" subtitle="Write-back öncesi kontrol" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={[styles.noticePanel, hasDanger ? styles.noticeDanger : hasWarning ? styles.noticeWarning : styles.noticeSuccess]}>
        <View style={styles.noticeTop}>
          <View style={styles.noticeTextBlock}>
            <Text style={styles.kicker}>GÜVENLİK KAPISI</Text>
            <Text style={[styles.noticeTitle, hasDanger ? styles.textDanger : hasWarning ? styles.textWarning : styles.textSuccess]}>
              {hasDanger ? 'Vega write-back için eksikler var.' : hasWarning ? 'Vega write-back öncesi kontrol gereken yerler var.' : 'Hazırlık kontrolleri iyi görünüyor.'}
            </Text>
          </View>
          <StatusPill label={hasDanger ? 'Hazır değil' : hasWarning ? 'Dikkat' : 'Hazır'} tone={hasDanger ? 'danger' : hasWarning ? 'warning' : 'success'} />
        </View>
        <Text style={styles.noticeText}>Bu ekran sadece kontrol içindir, Vega’ya yazmaz. INSERT, UPDATE, DELETE veya otomatik sync çalıştırılmaz.</Text>
        <Text style={styles.noticeMeta}>Son kontrol: {formatDate(checkedAt)}</Text>
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Hazır" value={checks.filter((check) => check.tone === 'success').length.toString()} tone="success" />
        <InfoBox label="Dikkat" value={checks.filter((check) => check.tone === 'warning').length.toString()} tone="warning" />
        <InfoBox label="Eksik" value={checks.filter((check) => check.tone === 'danger').length.toString()} tone="danger" />
      </View>

      <View style={styles.connectionBox}>
        <Text style={styles.connectionTitle}>Bağlantı bilgisi</Text>
        <Text style={styles.connectionText}>API adresi: {settings?.apiBaseUrl || 'Henüz okunmadı'}</Text>
        <Text style={styles.connectionText}>Fiyat servisi: {priceService?.message || 'Henüz kontrol edilmedi'}</Text>
        {priceService?.endpoint ? <Text style={styles.connectionText}>Endpoint: {priceService.endpoint}</Text> : null}
        {priceService?.reason ? <Text style={styles.connectionText}>Not: {priceService.reason}</Text> : null}
      </View>

      <View style={styles.checkList}>
        {checks.map((check) => (
          <View key={check.id} style={[styles.checkCard, check.tone === 'success' && styles.checkSuccess, check.tone === 'warning' && styles.checkWarning, check.tone === 'danger' && styles.checkDanger]}>
            <View style={styles.checkTextBlock}>
              <Text style={styles.checkTitle}>{check.title}</Text>
              <Text style={styles.checkDescription}>{check.description}</Text>
            </View>
            <StatusPill label={check.statusLabel} tone={check.tone} />
          </View>
        ))}
      </View>

      <View style={styles.nextStepsBox}>
        <Text style={styles.nextStepsTitle}>Vega write-back için kalan eksikler</Text>
        <Text style={styles.nextStepsText}>Test DB adı, başlık/satır tablo kolonları, yetki seviyesi, test fişi prosedürü ve rollback planı netleşmeden canlı yazma açılmamalı.</Text>
      </View>

      <AppButton label={checking ? 'Kontrol Ediliyor' : 'Kontrolleri Yenile'} onPress={runCheck} variant="secondary" compact />
    </ScreenShell>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone: ReadinessTone }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'success' && styles.textSuccess, tone === 'warning' && styles.textWarning, tone === 'danger' && styles.textDanger]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticePanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  noticeWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  noticeDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  noticeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  noticeTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  noticeTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  noticeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  noticeMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
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
  connectionBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  connectionTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  connectionText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  checkList: { gap: spacing.xs },
  checkCard: {
    minHeight: 70,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkSuccess: { borderColor: '#bce7c8', borderLeftColor: colors.success },
  checkWarning: { borderColor: '#efd5a7', borderLeftColor: colors.amber, backgroundColor: colors.warningSoft },
  checkDanger: { borderColor: '#f3bcc5', borderLeftColor: colors.red, backgroundColor: colors.dangerSoft },
  checkTextBlock: { flex: 1, gap: 2 },
  checkTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  checkDescription: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  nextStepsBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  nextStepsTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  nextStepsText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  textSuccess: { color: colors.success },
  textWarning: { color: colors.amber },
  textDanger: { color: colors.red },
});
