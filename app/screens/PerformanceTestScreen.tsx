import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadActiveSaleDraft, loadAuditLogs, loadSaleDrafts, loadSalePrintJobs } from '../../storage/localStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { ActiveSaleDraft, AuditLogEntry, PrintEvent } from '../../types';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type PerfTone = 'success' | 'warning' | 'danger';

type PerfEvent = {
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  tone: PerfTone;
};

type PerfSnapshot = {
  openDraftCount: number;
  activeLineCount: number;
  printQueueSize: number;
  offlineQueueSize: number;
  recentErrorCount: number;
  largeReceiptCount: number;
  slowAddCount: number;
  events: PerfEvent[];
};

const LARGE_RECEIPT_LINE_LIMIT = 100;
const SLOW_ADD_MS = 5000;

const emptySnapshot: PerfSnapshot = {
  openDraftCount: 0,
  activeLineCount: 0,
  printQueueSize: 0,
  offlineQueueSize: 0,
  recentErrorCount: 0,
  largeReceiptCount: 0,
  slowAddCount: 0,
  events: [],
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isRecent = (value: string, hours = 24) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
};

const cleanText = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return 'Kayıt incelenmeli.';
  return text.length > 110 ? `${text.slice(0, 107)}...` : text;
};

const countOpenDrafts = (activeDraft: ActiveSaleDraft | null, drafts: ActiveSaleDraft[]) => {
  const openDraftNos = new Set(drafts.filter((draft) => draft.draftStatus !== 'printPending').map((draft) => draft.documentNo));
  if (activeDraft?.documentNo) openDraftNos.add(activeDraft.documentNo);
  return openDraftNos.size;
};

const detectSlowAdds = (logs: AuditLogEntry[]) => {
  const sortedLogs = [...logs].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  const lastScanByDocument = new Map<string, AuditLogEntry>();
  const slowEvents: PerfEvent[] = [];

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
    if (elapsed > SLOW_ADD_MS) {
      slowEvents.push({
        id: `slow-${log.id}`,
        createdAt: log.createdAt,
        title: 'Fişe ekleme gecikti',
        detail: `${Math.round(elapsed / 1000)} sn sürdü · ${log.documentNo || 'Fiş yok'}`,
        tone: 'warning',
      });
    }
    lastScanByDocument.delete(key);
  });

  return slowEvents;
};

const collectPerfEvents = (logs: AuditLogEntry[], printEvents: PrintEvent[], offlineActions: OfflineQueueAction[], slowEvents: PerfEvent[]) => {
  const errorLogEvents = logs
    .filter((log) => isRecent(log.createdAt) && log.status === 'error')
    .map((log) => ({
      id: `audit-${log.id}`,
      createdAt: log.createdAt,
      title: log.operationType,
      detail: cleanText(log.description),
      tone: 'danger' as PerfTone,
    }));

  const printPerfEvents = printEvents
    .filter((event) => isRecent(event.createdAt) && (event.eventType === 'printError' || event.eventType === 'retryError'))
    .map((event) => ({
      id: `print-${event.id}`,
      createdAt: event.createdAt,
      title: event.eventType === 'retryError' ? 'Tekrar deneme hatası' : 'Yazdırma hatası',
      detail: cleanText(event.errorMessage || event.message),
      tone: 'danger' as PerfTone,
    }));

  const offlinePerfEvents = offlineActions
    .filter((action) => isRecent(action.updatedAt || action.createdAt) && action.status === 'error')
    .map((action) => ({
      id: `offline-${action.id}`,
      createdAt: action.updatedAt || action.createdAt,
      title: 'Offline kuyruk hatası',
      detail: cleanText(action.lastError || action.retry.lastError),
      tone: 'warning' as PerfTone,
    }));

  return [...slowEvents, ...errorLogEvents, ...printPerfEvents, ...offlinePerfEvents]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 12);
};

export function PerformanceTestScreen({ onBack }: { onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<PerfSnapshot>(emptySnapshot);

  useEffect(() => {
    Promise.all([
      loadActiveSaleDraft(),
      loadSaleDrafts(),
      loadSalePrintJobs(),
      loadOfflineActions(),
      loadAuditLogs(),
      loadPrintEvents(),
    ]).then(([activeDraft, drafts, printJobs, offlineActions, logs, printEvents]) => {
      const slowEvents = detectSlowAdds(logs.filter((log) => isRecent(log.createdAt)));
      const largeReceiptCount = [activeDraft, ...drafts].filter((draft): draft is ActiveSaleDraft => Boolean(draft)).filter((draft) => draft.lines.length >= LARGE_RECEIPT_LINE_LIMIT).length;
      const events = collectPerfEvents(logs, printEvents, offlineActions, slowEvents);
      setSnapshot({
        openDraftCount: countOpenDrafts(activeDraft, drafts),
        activeLineCount: activeDraft?.lines.length || 0,
        printQueueSize: printJobs.filter((job) => job.status !== 'Yazdırıldı').length,
        offlineQueueSize: offlineActions.length,
        recentErrorCount: logs.filter((log) => isRecent(log.createdAt) && log.status === 'error').length + printEvents.filter((event) => isRecent(event.createdAt) && (event.eventType === 'printError' || event.eventType === 'retryError')).length + offlineActions.filter((action) => action.status === 'error').length,
        largeReceiptCount,
        slowAddCount: slowEvents.length,
        events,
      });
    });
  }, []);

  const hasIssue = useMemo(() => snapshot.recentErrorCount > 0 || snapshot.largeReceiptCount > 0 || snapshot.slowAddCount > 0 || snapshot.printQueueSize >= 20 || snapshot.offlineQueueSize >= 20, [snapshot]);

  return (
    <ScreenShell title="Performans Testi" subtitle="Yoğun kullanım izleme" onBack={onBack}>
      <View style={[styles.readyPanel, hasIssue ? styles.readyPanelWarning : styles.readyPanelSuccess]}>
        <View style={styles.readyTop}>
          <View style={styles.readyTextBlock}>
            <Text style={styles.kicker}>YOĞUN KULLANIM</Text>
            <Text style={[styles.readyTitle, hasIssue ? styles.readyTitleWarning : styles.readyTitleSuccess]}>
              {hasIssue ? 'Yoğun kullanım sırasında yavaşlama algılandı.' : 'Yoğun kullanım için kritik sorun görünmüyor.'}
            </Text>
            <Text style={styles.metaText}>Büyük fiş sınırı: {LARGE_RECEIPT_LINE_LIMIT}+ satır · Yavaş ekleme: 5 sn üstü</Text>
          </View>
          <StatusPill label={hasIssue ? 'Dikkat' : 'Hazır'} tone={hasIssue ? 'warning' : 'success'} />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Açık fiş" value={snapshot.openDraftCount.toString()} tone={snapshot.openDraftCount > 0 ? 'warning' : 'success'} />
        <Metric label="Mevcut satır" value={snapshot.activeLineCount.toString()} tone={snapshot.activeLineCount >= LARGE_RECEIPT_LINE_LIMIT ? 'danger' : snapshot.activeLineCount >= 60 ? 'warning' : 'success'} />
        <Metric label="Print queue" value={snapshot.printQueueSize.toString()} tone={snapshot.printQueueSize >= 20 ? 'danger' : snapshot.printQueueSize > 0 ? 'warning' : 'success'} />
        <Metric label="Offline queue" value={snapshot.offlineQueueSize.toString()} tone={snapshot.offlineQueueSize >= 20 ? 'danger' : snapshot.offlineQueueSize > 0 ? 'warning' : 'success'} />
        <Metric label="Son hata" value={snapshot.recentErrorCount.toString()} tone={snapshot.recentErrorCount > 0 ? 'danger' : 'success'} />
        <Metric label="Yavaş ekleme" value={snapshot.slowAddCount.toString()} tone={snapshot.slowAddCount > 0 ? 'warning' : 'success'} />
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Performans kontrol mantığı</Text>
        <Text style={styles.warningText}>100+ satırlı fiş büyük fiş sayılır. Barkod okutulduktan sonra ürünün fişe eklenmesi 5 saniyeyi aşarsa yavaşlama olarak işaretlenir. Print/offline kuyruk 20 kayda yaklaşırsa kuyruk şişmesi kabul edilir.</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Son yoğun kullanım olayları</Text>
        <StatusPill label={`${snapshot.events.length} kayıt`} tone={snapshot.events.length > 0 ? 'warning' : 'success'} />
      </View>

      {snapshot.events.length === 0 ? (
        <EmptyState badge="OK" title="Olay yok" description="Son kullanımda yavaşlama, hata veya kuyruk sorunu görünmüyor." />
      ) : (
        <ScrollView style={styles.eventList} nestedScrollEnabled>
          {snapshot.events.map((event) => (
            <View key={event.id} style={[styles.eventCard, event.tone === 'danger' ? styles.eventDanger : styles.eventWarning]}>
              <View style={styles.eventTextBlock}>
                <View style={styles.eventTitleRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.createdAt)}</Text>
                </View>
                <Text style={styles.eventDetail}>{event.detail}</Text>
              </View>
              <StatusPill label={event.tone === 'danger' ? 'Sorun' : 'Dikkat'} tone={event.tone} />
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone: PerfTone;
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <View style={styles.metricBox}>
      <Text style={[styles.metricValue, tone === 'success' && styles.metricSuccess, tone === 'warning' && styles.metricWarning, tone === 'danger' && styles.metricDanger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metricBox: {
    width: '31.8%',
    minHeight: 58,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    justifyContent: 'center',
    gap: 2,
  },
  metricValue: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  metricSuccess: { color: colors.success },
  metricWarning: { color: colors.amber },
  metricDanger: { color: colors.red },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  warningBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  warningTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  warningText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  eventList: { maxHeight: 420 },
  eventCard: {
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
  eventWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  eventDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  eventTextBlock: { flex: 1, gap: 2 },
  eventTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  eventTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  eventDate: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  eventDetail: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
});
