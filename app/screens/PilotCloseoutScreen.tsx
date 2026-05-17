import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadActiveSaleDraft, loadAuditLogs, loadSaleDrafts, loadSalePrintJobs } from '../../storage/localStorage';
import { loadPilotFeedback } from '../../storage/pilotFeedbackStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { ActiveSaleDraft, AppScreen, AuditLogEntry, PrintEvent, SalePrintJob } from '../../types';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type CloseoutData = {
  activeSaleDraft: ActiveSaleDraft | null;
  saleDrafts: ActiveSaleDraft[];
  printJobs: SalePrintJob[];
  offlineActions: OfflineQueueAction[];
  auditLogs: AuditLogEntry[];
  printEvents: PrintEvent[];
  feedbackCountToday: number;
};

type CloseoutCheck = {
  title: string;
  detail: string;
  active: boolean;
  group: 'Açık fişler' | 'Yazdırma' | 'Offline' | 'Hatalar' | 'Geri Bildirim' | 'Performans';
};

const emptyData: CloseoutData = {
  activeSaleDraft: null,
  saleDrafts: [],
  printJobs: [],
  offlineActions: [],
  auditLogs: [],
  printEvents: [],
  feedbackCountToday: 0,
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const hasPilotIssueText = (log: AuditLogEntry) => {
  const source = `${log.operationType} ${log.description}`.toLocaleLowerCase('tr-TR');
  return source.includes('bulunamadı')
    || source.includes('ürün bulunamadı')
    || source.includes('urun bulunamadi')
    || (source.includes('fiyat') && (source.includes('alınamadı') || source.includes('alinamadi') || log.status === 'error'));
};

const detectSlowAddsToday = (logs: AuditLogEntry[]) => {
  const sortedLogs = logs.filter((log) => isToday(log.createdAt)).sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  const lastScanByDocument = new Map<string, AuditLogEntry>();
  let slowCount = 0;

  sortedLogs.forEach((log) => {
    const key = log.documentNo || 'unknown';
    if (log.operationType === 'Ürün okutuldu' && log.status === 'success') {
      lastScanByDocument.set(key, log);
      return;
    }
    if (log.operationType !== 'Ürün fişe eklendi') return;
    const scan = lastScanByDocument.get(key);
    if (!scan) return;
    const elapsed = new Date(log.createdAt).getTime() - new Date(scan.createdAt).getTime();
    if (elapsed > 5000) slowCount += 1;
    lastScanByDocument.delete(key);
  });

  return slowCount;
};

export function PilotCloseoutScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (screen: AppScreen) => void }) {
  const [data, setData] = useState<CloseoutData>(emptyData);

  useEffect(() => {
    Promise.all([
      loadActiveSaleDraft(),
      loadSaleDrafts(),
      loadSalePrintJobs(),
      loadOfflineActions(),
      loadAuditLogs(),
      loadPrintEvents(),
      loadPilotFeedback(),
    ]).then(([activeSaleDraft, saleDrafts, printJobs, offlineActions, auditLogs, printEvents, feedback]) => {
      setData({
        activeSaleDraft,
        saleDrafts,
        printJobs,
        offlineActions,
        auditLogs,
        printEvents,
        feedbackCountToday: feedback.filter((entry) => isToday(entry.createdAt)).length,
      });
    });
  }, []);

  const summary = useMemo(() => {
    const openDraftNos = new Set(data.saleDrafts.filter((draft) => draft.draftStatus !== 'printPending').map((draft) => draft.documentNo));
    const hasActiveSale = Boolean(data.activeSaleDraft?.documentNo || (data.activeSaleDraft?.lines.length || 0) > 0);
    if (data.activeSaleDraft?.documentNo) openDraftNos.add(data.activeSaleDraft.documentNo);
    const todayPrintErrors = data.printEvents.filter((event) => isToday(event.createdAt) && (event.eventType === 'printError' || event.eventType === 'retryError')).length;
    const todayPilotIssues = data.auditLogs.filter((log) => isToday(log.createdAt) && hasPilotIssueText(log)).length + todayPrintErrors + data.offlineActions.filter((action) => isToday(action.updatedAt || action.createdAt) && action.status === 'error').length;
    const largeReceiptCount = [data.activeSaleDraft, ...data.saleDrafts].filter((draft): draft is ActiveSaleDraft => Boolean(draft)).filter((draft) => draft.lines.length >= 100).length;
    const slowAdds = detectSlowAddsToday(data.auditLogs);
    const queueWarning = data.printJobs.filter((job) => job.status !== 'Yazdırıldı').length >= 20 || data.offlineActions.length >= 20;
    return {
      openSaleDrafts: openDraftNos.size,
      hasActiveSale,
      pendingPrint: data.printJobs.filter((job) => job.status === 'Yazdırma bekliyor').length,
      printErrors: data.printJobs.filter((job) => job.status === 'Yazdırma hatası').length,
      offlinePending: data.offlineActions.filter((action) => action.status === 'pending').length,
      offlineErrors: data.offlineActions.filter((action) => action.status === 'error').length,
      todayPilotIssues,
      todayFeedback: data.feedbackCountToday,
      performanceWarnings: largeReceiptCount + slowAdds + (queueWarning ? 1 : 0),
    };
  }, [data]);

  const checks: CloseoutCheck[] = [
    { title: 'Açık satış fişi', detail: summary.openSaleDrafts > 0 || summary.hasActiveSale ? `${summary.openSaleDrafts} açık fiş veya aktif satış var.` : 'Açık satış fişi görünmüyor.', active: summary.openSaleDrafts > 0 || summary.hasActiveSale, group: 'Açık fişler' },
    { title: 'Yazdırma bekleyen', detail: summary.pendingPrint > 0 ? `${summary.pendingPrint} yazdırılmamış iş var.` : 'Yazdırma bekleyen iş yok.', active: summary.pendingPrint > 0, group: 'Yazdırma' },
    { title: 'Yazdırma hatası', detail: summary.printErrors > 0 ? `${summary.printErrors} yazdırma hatası var.` : 'Yazdırma hatası görünmüyor.', active: summary.printErrors > 0, group: 'Yazdırma' },
    { title: 'Offline kuyruk', detail: summary.offlinePending + summary.offlineErrors > 0 ? `${summary.offlinePending} bekleyen, ${summary.offlineErrors} hatalı offline iş var.` : 'Offline kuyruk temiz.', active: summary.offlinePending + summary.offlineErrors > 0, group: 'Offline' },
    { title: 'Bugünkü pilot hataları', detail: summary.todayPilotIssues > 0 ? `${summary.todayPilotIssues} pilot hata kaydı var.` : 'Bugün pilot hata kaydı yok.', active: summary.todayPilotIssues > 0, group: 'Hatalar' },
    { title: 'Bugünkü geri bildirim', detail: summary.todayFeedback > 0 ? `${summary.todayFeedback} geri bildirim var; kapanıştan önce oku.` : 'Bugün geri bildirim yok.', active: summary.todayFeedback > 0, group: 'Geri Bildirim' },
    { title: 'Performans uyarısı', detail: summary.performanceWarnings > 0 ? `${summary.performanceWarnings} performans uyarısı var.` : 'Bugün performans uyarısı görünmüyor.', active: summary.performanceWarnings > 0, group: 'Performans' },
  ];

  const activeChecks = checks.filter((check) => check.active);
  const cleanCloseout = activeChecks.length === 0;

  return (
    <ScreenShell title="Pilot Kapanış" subtitle="Test günü kapanış kontrolü" onBack={onBack}>
      <View style={[styles.noticeBox, cleanCloseout ? styles.noticeSuccess : styles.noticeWarning]}>
        <View style={styles.noticeTop}>
          <View style={styles.noticeTextBlock}>
            <Text style={styles.kicker}>PİLOT KAPANIŞ</Text>
            <Text style={[styles.noticeTitle, cleanCloseout ? styles.noticeSuccessText : styles.noticeWarningText]}>
              {cleanCloseout ? 'Bugünkü pilot test temiz kapandı.' : 'Kapanıştan önce kontrol edilmesi gereken işler var.'}
            </Text>
          </View>
          <StatusPill label={cleanCloseout ? 'Temiz' : 'Kontrol'} tone={cleanCloseout ? 'success' : 'warning'} />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Açık fiş" value={summary.openSaleDrafts.toString()} tone={summary.openSaleDrafts > 0 ? 'warning' : 'success'} />
        <InfoBox label="Print bekleyen" value={summary.pendingPrint.toString()} tone={summary.pendingPrint > 0 ? 'warning' : 'success'} />
        <InfoBox label="Print hata" value={summary.printErrors.toString()} tone={summary.printErrors > 0 ? 'danger' : 'success'} />
        <InfoBox label="Offline" value={(summary.offlinePending + summary.offlineErrors).toString()} tone={summary.offlinePending + summary.offlineErrors > 0 ? 'warning' : 'success'} />
        <InfoBox label="Bugünkü hata" value={summary.todayPilotIssues.toString()} tone={summary.todayPilotIssues > 0 ? 'danger' : 'success'} />
        <InfoBox label="Geri bildirim" value={summary.todayFeedback.toString()} tone={summary.todayFeedback > 0 ? 'warning' : 'success'} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kontrol listesi</Text>
        <StatusPill label={cleanCloseout ? 'Hazır' : `${activeChecks.length} başlık`} tone={cleanCloseout ? 'success' : 'warning'} />
      </View>

      <View style={styles.checkList}>
        {checks.map((check) => (
          <View key={check.title} style={[styles.checkRow, check.active ? styles.checkRowActive : styles.checkRowDone]}>
            <Text style={[styles.checkMark, check.active ? styles.checkMarkActive : styles.checkMarkDone]}>{check.active ? '!' : 'OK'}</Text>
            <View style={styles.checkTextBlock}>
              <Text style={styles.checkTitle}>{check.group}</Text>
              <Text style={styles.checkText}>{check.title}: {check.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {!cleanCloseout ? (
        <View style={styles.problemBox}>
          <Text style={styles.problemTitle}>Sorun başlıkları</Text>
          <Text style={styles.problemText}>{[...new Set(activeChecks.map((check) => check.group))].join(' · ')}</Text>
        </View>
      ) : null}

      <View style={styles.quickActions}>
        <AppButton label="Açık Fişler" onPress={() => onNavigate('openSaleDrafts')} variant="secondary" compact />
        <AppButton label="Yazdırma Kuyruğu" onPress={() => onNavigate('printQueue')} variant="secondary" compact />
        <AppButton label="Offline Kuyruk" onPress={() => onNavigate('offlineQueue')} variant="secondary" compact />
        <AppButton label="Pilot Hataları" onPress={() => onNavigate('pilotIssues')} variant="secondary" compact />
        <AppButton label="Pilot Raporu" onPress={() => onNavigate('pilotReport')} variant="dark" compact />
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

const styles = StyleSheet.create({
  noticeBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  noticeWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  noticeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  noticeTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  noticeTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  noticeSuccessText: { color: colors.success },
  noticeWarningText: { color: colors.amber },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  infoBox: {
    width: '31.8%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  infoDanger: { color: colors.red },
  infoWarning: { color: colors.amber },
  infoSuccess: { color: colors.success },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  checkList: { gap: spacing.xs },
  checkRow: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkRowActive: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7' },
  checkRowDone: { backgroundColor: colors.successSoft, borderColor: '#bce7c8' },
  checkMark: { width: 28, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  checkMarkActive: { color: colors.amber },
  checkMarkDone: { color: colors.success },
  checkTextBlock: { flex: 1, gap: 2 },
  checkTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  checkText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  problemBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#f3bcc5',
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: 2,
  },
  problemTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  problemText: { color: colors.text, fontSize: typography.small, fontWeight: '900', lineHeight: 16 },
  quickActions: { gap: spacing.xs },
});
