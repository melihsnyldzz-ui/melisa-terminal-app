import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadAuditLogs } from '../../storage/localStorage';
import { loadPilotFeedback } from '../../storage/pilotFeedbackStorage';
import type { PilotFeedbackCategory, PilotFeedbackEntry } from '../../storage/pilotFeedbackStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { AuditLogEntry, PrintEvent } from '../../types';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type IssueCategory = 'Barkod' | 'Fiyat' | 'Yazdırma' | 'Bağlantı' | 'Offline';

type ReportIssue = {
  id: string;
  createdAt: string;
  category: IssueCategory;
  message: string;
  documentNo?: string;
};

type ReportSummary = {
  issues: ReportIssue[];
  feedback: PilotFeedbackEntry[];
  issueCounts: Record<IssueCategory, number>;
  feedbackCounts: Record<PilotFeedbackCategory, number>;
  recentIssueCount: number;
};

const issueCategories: IssueCategory[] = ['Barkod', 'Fiyat', 'Yazdırma', 'Bağlantı', 'Offline'];
const feedbackCategories: PilotFeedbackCategory[] = ['Satış', 'Barkod', 'Yazdırma', 'Performans', 'Kullanım Kolaylığı', 'Diğer'];

const emptyCounts = <T extends string>(keys: T[]) => keys.reduce<Record<T, number>>((acc, key) => {
  acc[key] = 0;
  return acc;
}, {} as Record<T, number>);

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

const cleanMessage = (value?: string) => {
  const message = String(value || '').trim();
  if (!message) return 'Kontrol edilmesi gereken kayıt var.';
  if (message.toLocaleLowerCase('tr-TR').includes('network') || message.toLocaleLowerCase('tr-TR').includes('failed to fetch')) {
    return 'Servis açık değil veya ağ bağlantısı yok.';
  }
  return message.length > 105 ? `${message.slice(0, 102)}...` : message;
};

const issueFromAudit = (log: AuditLogEntry): ReportIssue | null => {
  const source = `${log.operationType} ${log.description}`.toLocaleLowerCase('tr-TR');
  if (source.includes('bulunamadı') || source.includes('urun bulunamadi') || source.includes('ürün bulunamadı')) {
    return { id: `audit-${log.id}`, createdAt: log.createdAt, category: 'Barkod', message: 'Ürün bulunamadı.', documentNo: log.documentNo };
  }
  if (source.includes('fiyat') && (source.includes('alınamadı') || source.includes('alinamadi') || log.status === 'error')) {
    return { id: `audit-${log.id}`, createdAt: log.createdAt, category: 'Fiyat', message: 'Fiyat alınamadı.', documentNo: log.documentNo };
  }
  return null;
};

const issueFromPrintEvent = (event: PrintEvent): ReportIssue | null => {
  if (event.eventType !== 'printError' && event.eventType !== 'retryError') return null;
  const message = cleanMessage(event.errorMessage || event.message);
  const isBridgeIssue = event.bridgeStatus === 'disconnected' || message.toLocaleLowerCase('tr-TR').includes('ulaşılamıyor');
  return {
    id: `print-${event.id}`,
    createdAt: event.createdAt,
    category: isBridgeIssue ? 'Bağlantı' : 'Yazdırma',
    message: event.eventType === 'retryError' ? `Tekrar deneme başarısız: ${message}` : message,
    documentNo: event.documentNo || event.draftId,
  };
};

const issueFromOfflineAction = (action: OfflineQueueAction): ReportIssue | null => {
  if (action.status !== 'error') return null;
  return {
    id: `offline-${action.id}`,
    createdAt: action.updatedAt || action.createdAt,
    category: 'Offline',
    message: action.actionType === 'printRetry'
      ? `Yazdırma tekrar kuyruğunda hata: ${cleanMessage(action.lastError || action.retry.lastError)}`
      : `Satış tamamlama kuyruğunda hata: ${cleanMessage(action.lastError || action.retry.lastError)}`,
    documentNo: action.documentNo,
  };
};

const getTopKey = <T extends string>(counts: Record<T, number>, keys: T[]) => [...keys].sort((first, second) => counts[second] - counts[first])[0];

const buildAdvice = (summary: ReportSummary) => {
  if (summary.issueCounts.Yazdırma + summary.issueCounts.Bağlantı > 0) return 'Önce yazdırma sorunları çözülmeli.';
  if (summary.issueCounts.Barkod + summary.issueCounts.Fiyat > 0) return 'Önce barkod/fiyat sorunları kontrol edilmeli.';
  if (summary.issueCounts.Offline > 0) return 'Offline kuyruk kayıtları kontrol edilmeli.';
  return 'Pilot test için ciddi sorun görünmüyor.';
};

export function PilotReportScreen({ onBack }: { onBack: () => void }) {
  const [summary, setSummary] = useState<ReportSummary>({
    issues: [],
    feedback: [],
    issueCounts: emptyCounts(issueCategories),
    feedbackCounts: emptyCounts(feedbackCategories),
    recentIssueCount: 0,
  });

  useEffect(() => {
    Promise.all([loadAuditLogs(), loadPrintEvents(), loadOfflineActions(), loadPilotFeedback()]).then(([logs, printEvents, offlineActions, feedback]) => {
      const issues = [
        ...logs.map(issueFromAudit).filter((issue): issue is ReportIssue => Boolean(issue)),
        ...printEvents.map(issueFromPrintEvent).filter((issue): issue is ReportIssue => Boolean(issue)),
        ...offlineActions.map(issueFromOfflineAction).filter((issue): issue is ReportIssue => Boolean(issue)),
      ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

      const issueCounts = emptyCounts(issueCategories);
      issues.forEach((issue) => {
        issueCounts[issue.category] += 1;
      });

      const feedbackCounts = emptyCounts(feedbackCategories);
      feedback.forEach((entry) => {
        feedbackCounts[entry.category] += 1;
      });

      setSummary({
        issues,
        feedback: [...feedback].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
        issueCounts,
        feedbackCounts,
        recentIssueCount: issues.filter((issue) => isRecent(issue.createdAt)).length,
      });
    });
  }, []);

  const topIssue = useMemo(() => getTopKey(summary.issueCounts, issueCategories), [summary.issueCounts]);
  const topFeedback = useMemo(() => getTopKey(summary.feedbackCounts, feedbackCategories), [summary.feedbackCounts]);
  const advice = useMemo(() => buildAdvice(summary), [summary]);
  const hasSeriousIssue = summary.issues.length > 0;

  return (
    <ScreenShell title="Pilot Raporu" subtitle="Pilot test genel özeti" onBack={onBack}>
      <View style={[styles.heroPanel, hasSeriousIssue ? styles.heroWarning : styles.heroSuccess]}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.kicker}>PİLOT DURUMU</Text>
            <Text style={[styles.heroTitle, hasSeriousIssue ? styles.heroTitleWarning : styles.heroTitleSuccess]}>{advice}</Text>
          </View>
          <StatusPill label={hasSeriousIssue ? 'Dikkat' : 'Temiz'} tone={hasSeriousIssue ? 'warning' : 'success'} />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Toplam hata" value={summary.issues.length.toString()} tone={summary.issues.length > 0 ? 'warning' : 'success'} />
        <Metric label="En sık hata" value={summary.issues.length > 0 ? topIssue : 'Yok'} tone={summary.issues.length > 0 ? 'warning' : 'success'} />
        <Metric label="Geri bildirim" value={summary.feedback.length.toString()} tone={summary.feedback.length > 0 ? 'warning' : 'success'} />
        <Metric label="En sık geri bildirim" value={summary.feedback.length > 0 ? topFeedback : 'Yok'} tone={summary.feedback.length > 0 ? 'warning' : 'success'} />
        <Metric label="Son 24s hata" value={summary.recentIssueCount.toString()} tone={summary.recentIssueCount > 0 ? 'danger' : 'success'} />
        <Metric label="Yazdırma hata" value={summary.issueCounts.Yazdırma.toString()} tone={summary.issueCounts.Yazdırma > 0 ? 'danger' : 'success'} />
        <Metric label="Bağlantı hata" value={summary.issueCounts.Bağlantı.toString()} tone={summary.issueCounts.Bağlantı > 0 ? 'danger' : 'success'} />
        <Metric label="Offline hata" value={summary.issueCounts.Offline.toString()} tone={summary.issueCounts.Offline > 0 ? 'warning' : 'success'} />
      </View>

      <View style={styles.adviceBox}>
        <Text style={styles.adviceTitle}>Öneri</Text>
        <Text style={styles.adviceText}>{advice}</Text>
      </View>

      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son 5 Hata</Text>
          <StatusPill label={`${Math.min(summary.issues.length, 5)} kayıt`} tone={summary.issues.length > 0 ? 'warning' : 'success'} />
        </View>
        {summary.issues.length === 0 ? (
          <EmptyState badge="OK" title="Hata yok" description="Pilot hata kaydı görünmüyor." />
        ) : (
          <ScrollView style={styles.shortList} nestedScrollEnabled>
            {summary.issues.slice(0, 5).map((issue) => (
              <View key={issue.id} style={styles.listCard}>
                <View style={styles.listTop}>
                  <Text style={styles.listTitle}>{issue.category}</Text>
                  <Text style={styles.listDate}>{formatDate(issue.createdAt)}</Text>
                </View>
                <Text style={styles.listText}>{issue.message}</Text>
                <Text style={styles.listMeta}>Fiş/Draft: {issue.documentNo || '-'}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son 5 Geri Bildirim</Text>
          <StatusPill label={`${Math.min(summary.feedback.length, 5)} kayıt`} tone={summary.feedback.length > 0 ? 'warning' : 'success'} />
        </View>
        {summary.feedback.length === 0 ? (
          <EmptyState badge="OK" title="Geri bildirim yok" description="Personel pilot notu bırakmamış." />
        ) : (
          <ScrollView style={styles.shortList} nestedScrollEnabled>
            {summary.feedback.slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.listCard}>
                <View style={styles.listTop}>
                  <Text style={styles.listTitle}>{entry.category}</Text>
                  <Text style={styles.listDate}>{formatDate(entry.createdAt)}</Text>
                </View>
                <Text style={styles.listText}>{entry.description}</Text>
                <Text style={styles.listMeta}>{entry.createdByName || 'Personel'} · {entry.createdByCode || '-'}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenShell>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger';
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <View style={styles.metricBox}>
      <Text style={[styles.metricValue, tone === 'success' && styles.metricSuccess, tone === 'warning' && styles.metricWarning, tone === 'danger' && styles.metricDanger]} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  heroSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  heroWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  heroTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  heroTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  heroTitleSuccess: { color: colors.success },
  heroTitleWarning: { color: colors.amber },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metricBox: {
    width: '48.7%',
    minHeight: 58,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    justifyContent: 'center',
    gap: 2,
  },
  metricValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  metricSuccess: { color: colors.success },
  metricWarning: { color: colors.amber },
  metricDanger: { color: colors.red },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  adviceBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  adviceTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  adviceText: { color: colors.text, fontSize: typography.body, fontWeight: '800', lineHeight: 17 },
  listSection: { gap: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  shortList: { maxHeight: 230 },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.line,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: 2,
  },
  listTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  listTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  listDate: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  listText: { color: colors.ink, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  listMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
});
