import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadActiveSaleDraft, loadSaleDrafts, loadSalePrintJobs } from '../../storage/localStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { ActiveSaleDraft, AppScreen, PrintEvent, SalePrintJob } from '../../types';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type EndOfDaySummaryScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type EndOfDayData = {
  activeSaleDraft: ActiveSaleDraft | null;
  saleDrafts: ActiveSaleDraft[];
  printJobs: SalePrintJob[];
  offlineActions: OfflineQueueAction[];
  printEvents: PrintEvent[];
};

const emptyData: EndOfDayData = {
  activeSaleDraft: null,
  saleDrafts: [],
  printJobs: [],
  offlineActions: [],
  printEvents: [],
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export function EndOfDaySummaryScreen({ onBack, onNavigate }: EndOfDaySummaryScreenProps) {
  const [data, setData] = useState<EndOfDayData>(emptyData);

  useEffect(() => {
    Promise.all([
      loadActiveSaleDraft(),
      loadSaleDrafts(),
      loadSalePrintJobs(),
      loadOfflineActions(),
      loadPrintEvents(),
    ]).then(([activeSaleDraft, saleDrafts, printJobs, offlineActions, printEvents]) => {
      setData({ activeSaleDraft, saleDrafts, printJobs, offlineActions, printEvents });
    });
  }, []);

  const summary = useMemo(() => {
    const openDraftNos = new Set(data.saleDrafts.filter((draft) => draft.draftStatus !== 'printPending').map((draft) => draft.documentNo));
    const hasActiveSale = Boolean(data.activeSaleDraft?.documentNo || (data.activeSaleDraft?.lines.length || 0) > 0);
    if (data.activeSaleDraft?.documentNo) openDraftNos.add(data.activeSaleDraft.documentNo);
    const todayEvents = data.printEvents.filter((event) => isToday(event.createdAt));
    return {
      openSaleDrafts: openDraftNos.size,
      hasActiveSale,
      pendingPrintJobs: data.printJobs.filter((job) => job.status === 'Yazdırma bekliyor').length,
      printedJobs: data.printJobs.filter((job) => job.status === 'Yazdırıldı').length,
      printErrorJobs: data.printJobs.filter((job) => job.status === 'Yazdırma hatası').length,
      offlinePending: data.offlineActions.filter((action) => action.status === 'pending').length,
      offlineError: data.offlineActions.filter((action) => action.status === 'error').length,
      todayPrintError: todayEvents.filter((event) => event.eventType === 'printError' || event.eventType === 'retryError').length,
      todayRetryAttempt: todayEvents.filter((event) => event.eventType === 'retryAttempt').length,
    };
  }, [data]);

  const hasClosingIssue = summary.openSaleDrafts > 0
    || summary.hasActiveSale
    || summary.pendingPrintJobs > 0
    || summary.printErrorJobs > 0
    || summary.offlinePending > 0
    || summary.offlineError > 0
    || summary.todayPrintError > 0;

  return (
    <ScreenShell title="Gün Sonu Özeti" subtitle="Kapanış kontrol ekranı" onBack={onBack}>
      <View style={[styles.noticeBox, hasClosingIssue ? styles.noticeWarning : styles.noticeSuccess]}>
        <Text style={[styles.noticeTitle, hasClosingIssue ? styles.noticeWarningText : styles.noticeSuccessText]}>
          {hasClosingIssue ? 'Kapanıştan önce kontrol edilmesi gereken işler var.' : 'Bugün kapanış için sorun görünmüyor.'}
        </Text>
        <Text style={styles.noticeText}>Bu ekran local fiş, yazdırma ve offline queue kayıtlarından hesaplanır.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Açık satış fişleri" value={summary.openSaleDrafts.toString()} tone={summary.openSaleDrafts > 0 ? 'warning' : 'success'} />
        <InfoBox label="Aktif satış" value={summary.hasActiveSale ? 'Var' : 'Yok'} tone={summary.hasActiveSale ? 'warning' : 'success'} />
        <InfoBox label="Yazdırma bekleyen" value={summary.pendingPrintJobs.toString()} tone={summary.pendingPrintJobs > 0 ? 'warning' : 'success'} />
        <InfoBox label="Yazdırılmış" value={summary.printedJobs.toString()} tone="success" />
        <InfoBox label="Yazdırma hatası" value={summary.printErrorJobs.toString()} tone={summary.printErrorJobs > 0 ? 'danger' : 'success'} />
        <InfoBox label="Offline bekleyen" value={summary.offlinePending.toString()} tone={summary.offlinePending > 0 ? 'warning' : 'success'} />
        <InfoBox label="Offline hata" value={summary.offlineError.toString()} tone={summary.offlineError > 0 ? 'danger' : 'success'} />
        <InfoBox label="Bugünkü print hata" value={summary.todayPrintError.toString()} tone={summary.todayPrintError > 0 ? 'danger' : 'success'} />
        <InfoBox label="Bugünkü retry" value={summary.todayRetryAttempt.toString()} tone={summary.todayRetryAttempt > 0 ? 'warning' : 'success'} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kapanış kontrol listesi</Text>
        <StatusPill label={hasClosingIssue ? 'Kontrol et' : 'Hazır'} tone={hasClosingIssue ? 'warning' : 'success'} />
      </View>

      <View style={styles.checkList}>
        <CheckRow label="Açık fişleri kontrol et" active={summary.openSaleDrafts > 0 || summary.hasActiveSale} />
        <CheckRow label="Yazdırma kuyruğunu kontrol et" active={summary.pendingPrintJobs > 0 || summary.printErrorJobs > 0} />
        <CheckRow label="Offline kuyruğu kontrol et" active={summary.offlinePending > 0 || summary.offlineError > 0} />
        <CheckRow label="Yazdırma geçmişini kontrol et" active={summary.todayPrintError > 0 || summary.todayRetryAttempt > 0} />
      </View>

      <View style={styles.quickActions}>
        <AppButton label="Açık Fişler" onPress={() => onNavigate('openDocuments')} variant="secondary" compact />
        <AppButton label="Yazdırma Kuyruğu" onPress={() => onNavigate('printQueue')} variant="secondary" compact />
        <AppButton label="Offline Kuyruk" onPress={() => onNavigate('offlineQueue')} variant="secondary" compact />
        <AppButton label="Yazdırma Geçmişi" onPress={() => onNavigate('printEventHistory')} variant="dark" compact />
      </View>
    </ScreenShell>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' | 'success' }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'danger' && styles.infoDanger, tone === 'warning' && styles.infoWarning, tone === 'success' && styles.infoSuccess]} numberOfLines={1}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function CheckRow({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.checkRow, active ? styles.checkRowActive : styles.checkRowDone]}>
      <Text style={[styles.checkMark, active ? styles.checkMarkActive : styles.checkMarkDone]}>{active ? '!' : 'OK'}</Text>
      <Text style={styles.checkText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: 2,
  },
  noticeWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  noticeTitle: { fontSize: typography.body, fontWeight: '900' },
  noticeWarningText: { color: colors.amber },
  noticeSuccessText: { color: colors.success },
  noticeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  infoBox: {
    width: '48.7%',
    minHeight: 48,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoDanger: { color: colors.red },
  infoWarning: { color: colors.amber },
  infoSuccess: { color: colors.success },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  checkList: { gap: spacing.xs },
  checkRow: {
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkRowActive: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7' },
  checkRowDone: { backgroundColor: colors.successSoft, borderColor: '#bce7c8' },
  checkMark: { width: 28, textAlign: 'center', fontSize: typography.small, fontWeight: '900' },
  checkMarkActive: { color: colors.amber },
  checkMarkDone: { color: colors.success },
  checkText: { flex: 1, color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  quickActions: { gap: spacing.xs },
});
