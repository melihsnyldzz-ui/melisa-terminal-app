import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadAuditLogs } from '../../storage/localStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { AuditLogEntry, PrintEvent } from '../../types';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type PilotIssueCategory = 'Barkod' | 'Fiyat' | 'Yazdırma' | 'Bağlantı' | 'Offline';

type PilotIssue = {
  id: string;
  createdAt: string;
  category: PilotIssueCategory;
  message: string;
  documentNo?: string;
};

const categoryColors: Record<PilotIssueCategory, { tone: 'warning' | 'danger'; code: string }> = {
  Barkod: { tone: 'warning', code: 'BRK' },
  Fiyat: { tone: 'danger', code: 'FYT' },
  Yazdırma: { tone: 'danger', code: 'PRN' },
  Bağlantı: { tone: 'danger', code: 'NET' },
  Offline: { tone: 'warning', code: 'OFF' },
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

const cleanMessage = (value?: string) => {
  const message = String(value || '').trim();
  if (!message) return 'Kontrol edilmesi gereken bir hata oluştu.';
  if (message.toLocaleLowerCase('tr-TR').includes('network') || message.toLocaleLowerCase('tr-TR').includes('failed to fetch')) {
    return 'Servis açık değil veya ağ bağlantısı yok.';
  }
  if (message.length > 120) return `${message.slice(0, 117)}...`;
  return message;
};

const issueFromAudit = (log: AuditLogEntry): PilotIssue | null => {
  const source = `${log.operationType} ${log.description}`.toLocaleLowerCase('tr-TR');
  if (source.includes('bulunamadı') || source.includes('urun bulunamadi') || source.includes('ürün bulunamadı')) {
    return {
      id: `audit-${log.id}`,
      createdAt: log.createdAt,
      category: 'Barkod',
      message: 'Ürün bulunamadı.',
      documentNo: log.documentNo,
    };
  }
  if (source.includes('fiyat') && (source.includes('alınamadı') || source.includes('alinamadi') || log.status === 'error')) {
    return {
      id: `audit-${log.id}`,
      createdAt: log.createdAt,
      category: 'Fiyat',
      message: 'Fiyat alınamadı.',
      documentNo: log.documentNo,
    };
  }
  return null;
};

const issueFromPrintEvent = (event: PrintEvent): PilotIssue | null => {
  if (event.eventType !== 'printError' && event.eventType !== 'retryError') return null;
  const isBridgeIssue = event.bridgeStatus === 'disconnected' || cleanMessage(event.errorMessage || event.message).toLocaleLowerCase('tr-TR').includes('ulaşılamıyor');
  return {
    id: `print-${event.id}`,
    createdAt: event.createdAt,
    category: isBridgeIssue ? 'Bağlantı' : 'Yazdırma',
    message: event.eventType === 'retryError'
      ? `Tekrar deneme başarısız: ${cleanMessage(event.errorMessage || event.message)}`
      : cleanMessage(event.errorMessage || event.message || 'Yazdırma hatası oluştu.'),
    documentNo: event.documentNo || event.draftId,
  };
};

const issueFromOfflineAction = (action: OfflineQueueAction): PilotIssue | null => {
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

export function PilotIssueScreen({ onBack }: { onBack: () => void }) {
  const [issues, setIssues] = useState<PilotIssue[]>([]);

  useEffect(() => {
    Promise.all([loadAuditLogs(), loadPrintEvents(), loadOfflineActions()]).then(([logs, events, offlineActions]) => {
      const nextIssues = [
        ...logs.map(issueFromAudit).filter((issue): issue is PilotIssue => Boolean(issue)),
        ...events.map(issueFromPrintEvent).filter((issue): issue is PilotIssue => Boolean(issue)),
        ...offlineActions.map(issueFromOfflineAction).filter((issue): issue is PilotIssue => Boolean(issue)),
      ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
      setIssues(nextIssues);
    });
  }, []);

  const summary = useMemo(() => {
    const counts = issues.reduce<Record<PilotIssueCategory, number>>((acc, issue) => {
      acc[issue.category] += 1;
      return acc;
    }, { Barkod: 0, Fiyat: 0, Yazdırma: 0, Bağlantı: 0, Offline: 0 });
    const topCategory = (Object.keys(counts) as PilotIssueCategory[]).sort((first, second) => counts[second] - counts[first])[0];
    return {
      counts,
      topCategory,
      topCount: counts[topCategory],
    };
  }, [issues]);

  const hasIssues = issues.length > 0;

  return (
    <ScreenShell title="Pilot Hataları" subtitle={`${issues.length} kayıt`} onBack={onBack}>
      <View style={[styles.summaryPanel, hasIssues ? styles.summaryWarning : styles.summarySuccess]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.kicker}>PİLOT HATA TOPLAMA</Text>
            <Text style={[styles.summaryTitle, hasIssues ? styles.summaryTitleWarning : styles.summaryTitleSuccess]}>
              {hasIssues ? 'Pilot test sırasında dikkat edilmesi gereken sorunlar var.' : 'Pilot test sırasında kritik hata görünmüyor.'}
            </Text>
          </View>
          <StatusPill label={hasIssues ? 'Dikkat' : 'Temiz'} tone={hasIssues ? 'warning' : 'success'} />
        </View>
        <View style={styles.topIssueBox}>
          <Text style={styles.topIssueLabel}>En sık hata</Text>
          <Text style={[styles.topIssueValue, hasIssues ? styles.summaryTitleWarning : styles.summaryTitleSuccess]}>
            {hasIssues ? `${summary.topCategory} · ${summary.topCount}` : 'Yok'}
          </Text>
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {(Object.keys(summary.counts) as PilotIssueCategory[]).map((category) => (
          <View key={category} style={styles.categoryBox}>
            <Text style={[styles.categoryValue, summary.counts[category] > 0 && styles.categoryValueWarning]}>{summary.counts[category]}</Text>
            <Text style={styles.categoryLabel}>{category}</Text>
          </View>
        ))}
      </View>

      {issues.length === 0 ? (
        <EmptyState badge="OK" title="Kritik hata yok" description="Pilot test sırasında barkod, fiyat, yazdırma, bağlantı veya offline hata kaydı görünmüyor." />
      ) : (
        <ScrollView style={styles.issueList} nestedScrollEnabled>
          {issues.map((issue) => {
            const category = categoryColors[issue.category];
            return (
              <View key={issue.id} style={[styles.issueCard, category.tone === 'danger' ? styles.issueDanger : styles.issueWarning]}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{category.code}</Text>
                </View>
                <View style={styles.issueTextBlock}>
                  <View style={styles.issueTitleRow}>
                    <Text style={styles.issueTitle}>{issue.category}</Text>
                    <Text style={styles.issueDate}>{formatDate(issue.createdAt)}</Text>
                  </View>
                  <Text style={styles.issueMessage}>{issue.message}</Text>
                  <Text style={styles.issueMeta}>Fiş/Draft: {issue.documentNo || '-'}</Text>
                </View>
                <StatusPill label={category.tone === 'danger' ? 'Sorun' : 'Dikkat'} tone={category.tone} />
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  summarySuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  summaryWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  summaryTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  summaryTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  summaryTitleSuccess: { color: colors.success },
  summaryTitleWarning: { color: colors.amber },
  topIssueBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  topIssueLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  topIssueValue: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryBox: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  categoryValue: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  categoryValueWarning: { color: colors.amber },
  categoryLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  issueList: { maxHeight: 460 },
  issueCard: {
    minHeight: 70,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  issueWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  issueDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  codeBox: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  issueTextBlock: { flex: 1, gap: 2 },
  issueTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  issueTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  issueDate: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  issueMessage: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  issueMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
});
