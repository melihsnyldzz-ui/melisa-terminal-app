import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { checkLocalPriceService, checkPrintBridgeHealth } from '../../services/api';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadActiveSaleDraft, loadSaleDrafts, loadSalePrintJobs, loadSettings } from '../../storage/localStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { AppScreen } from '../../types';
import { colors, radius, spacing, typography } from '../theme';
import { formatBridgeCheckedAt } from '../utils/printBridgeHealthUtils';

type PilotTestScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type CheckTone = 'success' | 'warning' | 'danger';

type PilotCheck = {
  id: string;
  label: string;
  detail: string;
  tone: CheckTone;
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export function PilotTestScreen({ onBack, onNavigate }: PilotTestScreenProps) {
  const [loading, setLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | undefined>(undefined);
  const [checks, setChecks] = useState<PilotCheck[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'warning' } | null>(null);
  const [counts, setCounts] = useState({
    openDrafts: 0,
    pendingPrint: 0,
    printErrors: 0,
    offlinePending: 0,
    offlineErrors: 0,
    todayPrintErrors: 0,
  });

  const issueCount = useMemo(() => checks.filter((check) => check.tone !== 'success').length, [checks]);
  const hasDanger = useMemo(() => checks.some((check) => check.tone === 'danger'), [checks]);

  const refresh = async () => {
    setLoading(true);
    const [
      settings,
      priceHealth,
      bridgeHealth,
      activeDraft,
      saleDrafts,
      printJobs,
      offlineActions,
      printEvents,
    ] = await Promise.all([
      loadSettings(),
      loadSettings().then(checkLocalPriceService),
      checkPrintBridgeHealth(),
      loadActiveSaleDraft(),
      loadSaleDrafts(),
      loadSalePrintJobs(),
      loadOfflineActions(),
      loadPrintEvents(),
    ]);

    const openDraftNos = new Set(saleDrafts.filter((draft) => draft.draftStatus !== 'printPending').map((draft) => draft.documentNo));
    if (activeDraft?.documentNo) openDraftNos.add(activeDraft.documentNo);
    const pendingPrint = printJobs.filter((job) => job.status === 'Yazdırma bekliyor').length;
    const printErrors = printJobs.filter((job) => job.status === 'Yazdırma hatası').length;
    const offlinePending = offlineActions.filter((action) => action.status === 'pending').length;
    const offlineErrors = offlineActions.filter((action) => action.status === 'error').length;
    const todayPrintErrors = printEvents.filter((event) => isToday(event.createdAt) && (event.eventType === 'printError' || event.eventType === 'retryError')).length;

    const nextChecks: PilotCheck[] = [
      {
        id: 'barcode',
        label: 'Barkod okutma',
        detail: 'Satış ekranında test ürün barkodu okutularak doğrulanmalı.',
        tone: 'warning',
      },
      {
        id: 'price',
        label: 'Fiyat servisi',
        detail: priceHealth.ok ? 'Fiyat sistemi çalışıyor.' : priceHealth.reason || 'Fiyat sistemine ulaşılamıyor.',
        tone: priceHealth.ok ? 'success' : 'danger',
      },
      {
        id: 'bridge',
        label: 'Yazdırma bilgisayarı',
        detail: bridgeHealth.ok ? 'Yazdırma bilgisayarı bağlı.' : bridgeHealth.reason || 'Yazdırma bilgisayarına ulaşılamıyor.',
        tone: bridgeHealth.ok ? 'success' : 'danger',
      },
      {
        id: 'quickSale',
        label: 'Hızlı satış modu',
        detail: settings.quickSaleModeEnabled ? 'Hızlı satış açık.' : 'Hızlı satış kapalı. Pilot akışına göre kontrol et.',
        tone: settings.quickSaleModeEnabled ? 'success' : 'warning',
      },
      {
        id: 'sound',
        label: 'Sesli geri bildirim',
        detail: settings.scanSoundEnabled !== false ? 'Sesli geri bildirim açık.' : 'Sesli geri bildirim kapalı.',
        tone: settings.scanSoundEnabled !== false ? 'success' : 'warning',
      },
      {
        id: 'openDrafts',
        label: 'Açık fiş',
        detail: openDraftNos.size > 0 ? `${openDraftNos.size} açık fiş var.` : 'Açık fiş görünmüyor.',
        tone: openDraftNos.size > 0 ? 'warning' : 'success',
      },
      {
        id: 'printQueue',
        label: 'Yazdırma kuyruğu',
        detail: printErrors > 0 ? `${printErrors} yazdırma hatası var.` : pendingPrint > 0 ? `${pendingPrint} bekleyen yazdırma var.` : 'Yazdırma kuyruğu temiz.',
        tone: printErrors > 0 ? 'danger' : pendingPrint > 0 ? 'warning' : 'success',
      },
      {
        id: 'offline',
        label: 'Offline kuyruk',
        detail: offlineErrors > 0 ? `${offlineErrors} hata kaydı var.` : offlinePending > 0 ? `${offlinePending} bekleyen işlem var.` : 'Offline kuyruk temiz.',
        tone: offlineErrors > 0 ? 'danger' : offlinePending > 0 ? 'warning' : 'success',
      },
    ];

    setCounts({ openDrafts: openDraftNos.size, pendingPrint, printErrors, offlinePending, offlineErrors, todayPrintErrors });
    setChecks(nextChecks);
    setLastCheckedAt(new Date().toISOString());
    setBanner({
      message: nextChecks.some((check) => check.tone === 'danger') || nextChecks.filter((check) => check.tone === 'warning').length > 1
        ? 'Pilot test öncesi kontrol edilmesi gereken sorunlar var.'
        : 'Bugün test için sistem hazır görünüyor.',
      tone: nextChecks.some((check) => check.tone === 'danger') || nextChecks.filter((check) => check.tone === 'warning').length > 1 ? 'warning' : 'success',
    });
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <ScreenShell title="Pilot Test" subtitle="Saha öncesi hızlı kontrol" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={[styles.readyPanel, hasDanger || issueCount > 1 ? styles.readyPanelWarning : styles.readyPanelSuccess]}>
        <View style={styles.readyTop}>
          <View style={styles.readyTextBlock}>
            <Text style={styles.kicker}>PİLOT HAZIRLIK</Text>
            <Text style={[styles.readyTitle, hasDanger || issueCount > 1 ? styles.readyTitleWarning : styles.readyTitleSuccess]}>
              {hasDanger || issueCount > 1 ? 'Pilot test öncesi kontrol edilmesi gereken sorunlar var.' : 'Bugün test için sistem hazır görünüyor.'}
            </Text>
            <Text style={styles.metaText}>Son kontrol: {formatBridgeCheckedAt(lastCheckedAt)}</Text>
          </View>
          <StatusPill label={loading ? 'Kontrol' : hasDanger ? 'Sorun' : issueCount > 0 ? 'Dikkat' : 'Hazır'} tone={loading ? 'warning' : hasDanger ? 'danger' : issueCount > 0 ? 'warning' : 'success'} />
        </View>
        <View style={styles.summaryRow}>
          <Metric label="Açık fiş" value={counts.openDrafts.toString()} tone={counts.openDrafts > 0 ? 'warning' : 'success'} />
          <Metric label="Print hata" value={counts.printErrors.toString()} tone={counts.printErrors > 0 ? 'danger' : 'success'} />
          <Metric label="Offline hata" value={counts.offlineErrors.toString()} tone={counts.offlineErrors > 0 ? 'danger' : 'success'} />
        </View>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.sectionTitle}>Küçük Test Aksiyonları</Text>
        <View style={styles.actionGrid}>
          <PilotAction label="Test barkod okut" detail="Satış ekranını aç ve test ürün barkodunu okut." onPress={() => onNavigate('salesCustomer')} />
          <PilotAction label="Yazdırmayı kontrol et" detail="Yazdırma kuyruğu ve bridge durumuna bak." onPress={() => onNavigate('printQueue')} />
          <PilotAction label="Bağlantı testi" detail="Ayarlar içindeki bağlantı testini çalıştır." onPress={() => onNavigate('settings')} />
        </View>
        <AppButton label={loading ? 'Kontrol Ediliyor' : 'Durumu Yenile'} onPress={refresh} variant="secondary" compact />
      </View>

      <ScrollView style={styles.checkList} nestedScrollEnabled>
        {checks.map((check) => (
          <View key={check.id} style={[styles.checkCard, check.tone === 'success' && styles.checkSuccess, check.tone === 'warning' && styles.checkWarning, check.tone === 'danger' && styles.checkDanger]}>
            <View style={styles.checkIcon}>
              <Text style={[styles.checkIconText, check.tone === 'success' && styles.iconSuccess, check.tone === 'warning' && styles.iconWarning, check.tone === 'danger' && styles.iconDanger]}>
                {check.tone === 'success' ? '✓' : check.tone === 'warning' ? '!' : '×'}
              </Text>
            </View>
            <View style={styles.checkTextBlock}>
              <Text style={styles.checkTitle}>{check.label}</Text>
              <Text style={styles.checkDetail}>{check.detail}</Text>
            </View>
            <StatusPill label={check.tone === 'success' ? 'Hazır' : check.tone === 'warning' ? 'Dikkat' : 'Sorun'} tone={check.tone} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footerBox}>
        <Text style={styles.footerTitle}>Pilot notu</Text>
        <Text style={styles.footerText}>Test sırasında satış, barkod, yazdırma ve hata mesajları sırayla denenmeli. Bu ekran veri yazmaz; sadece güvenli kontrolleri ve mevcut kuyruk durumunu gösterir.</Text>
      </View>
    </ScreenShell>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone: CheckTone;
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <View style={styles.metricBox}>
      <Text style={[styles.metricValue, tone === 'success' && styles.iconSuccess, tone === 'warning' && styles.iconWarning, tone === 'danger' && styles.iconDanger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

type PilotActionProps = {
  label: string;
  detail: string;
  onPress: () => void;
};

function PilotAction({ label, detail, onPress }: PilotActionProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{label}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readyPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  readyPanelSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  readyPanelWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  readyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  readyTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  readyTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  readyTitleSuccess: { color: colors.success },
  readyTitleWarning: { color: colors.amber },
  metaText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  summaryRow: { flexDirection: 'row', gap: spacing.xs },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  metricValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  actionPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  actionGrid: { gap: spacing.xs },
  actionButton: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  actionText: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  actionDetail: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  checkList: { maxHeight: 380 },
  checkCard: {
    minHeight: 62,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  checkWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  checkDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  checkIconText: { fontSize: typography.section, fontWeight: '900' },
  iconSuccess: { color: colors.success },
  iconWarning: { color: colors.amber },
  iconDanger: { color: colors.red },
  checkTextBlock: { flex: 1, gap: 2 },
  checkTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  checkDetail: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  footerBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  footerTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  footerText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  pressed: { opacity: 0.86 },
});
