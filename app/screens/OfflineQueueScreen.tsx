import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type OfflineQueueScreenProps = {
  onBack: () => void;
};

const actionLabels: Record<OfflineQueueAction['actionType'], string> = {
  printRetry: 'Print retry',
  pendingSaleCompletion: 'Satış tamamlama',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function OfflineQueueScreen({ onBack }: OfflineQueueScreenProps) {
  const [actions, setActions] = useState<OfflineQueueAction[]>([]);

  useEffect(() => {
    loadOfflineActions().then(setActions);
  }, []);

  const summary = useMemo(() => ({
    pending: actions.filter((action) => action.status === 'pending').length,
    error: actions.filter((action) => action.status === 'error').length,
    printRetry: actions.filter((action) => action.actionType === 'printRetry').length,
    saleCompletion: actions.filter((action) => action.actionType === 'pendingSaleCompletion').length,
  }), [actions]);

  return (
    <ScreenShell title="Offline Kuyruk" subtitle="Debug / admin görünümü" onBack={onBack}>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>Altyapı modu</Text>
        <Text style={styles.noticeText}>Bu ekran yalnızca local queue durumunu gösterir. Auto retry, background sync ve gerçek write-back bu sürümde çalışmaz.</Text>
      </View>

      <View style={styles.summaryRow}>
        <InfoBox label="Bekleyen" value={summary.pending.toString()} />
        <InfoBox label="Hata" value={summary.error.toString()} tone="danger" />
      </View>
      <View style={styles.summaryRow}>
        <InfoBox label="Print retry" value={summary.printRetry.toString()} />
        <InfoBox label="Satış tamamlama" value={summary.saleCompletion.toString()} />
      </View>

      {actions.length === 0 ? (
        <EmptyState badge="SYNC" title="Offline işlem yok" description="Bağlantı hatası alınırsa hazırlanmış işlemler burada listelenir." />
      ) : (
        actions.map((action) => (
          <View key={action.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardMain}>
                <Text style={styles.documentNo}>{action.documentNo || action.id}</Text>
                <Text style={styles.customerName} numberOfLines={1}>{action.customerName || 'Müşteri yok'}</Text>
              </View>
              <StatusPill label={action.status === 'error' ? 'Hata' : 'Bekleyen'} tone={action.status === 'error' ? 'danger' : 'warning'} />
            </View>

            <View style={styles.metricRow}>
              <InfoBox label="İşlem" value={actionLabels[action.actionType]} />
              <InfoBox label="Retry" value={action.retryCount.toString()} />
            </View>
            <Text style={styles.metaText}>Oluşturma: {formatDate(action.createdAt)}</Text>
            {action.retry.lastTriedAt ? <Text style={styles.metaText}>Son deneme: {formatDate(action.retry.lastTriedAt)}</Text> : null}
            {action.lastError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Son hata</Text>
                <Text style={styles.errorText}>{action.lastError}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScreenShell>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'danger' && styles.infoDanger]} numberOfLines={1}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: 2,
  },
  noticeTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  noticeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryRow: { flexDirection: 'row', gap: spacing.xs },
  infoBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  infoDanger: { color: colors.red },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: spacing.xs },
  metaText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    padding: spacing.xs,
    gap: 2,
  },
  errorTitle: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  errorText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
});
