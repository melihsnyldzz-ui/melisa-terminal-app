import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadAuditLogs } from '../../storage/localStorage';
import type { AuditLogEntry, AuditLogStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type AuditLogScreenProps = {
  onBack: () => void;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toneForStatus = (status: AuditLogStatus) => {
  if (status === 'success') return 'success';
  if (status === 'error') return 'danger';
  return 'warning';
};

const labelForStatus = (status: AuditLogStatus) => {
  if (status === 'success') return 'Başarılı';
  if (status === 'error') return 'Hata';
  return 'Uyarı';
};

export function AuditLogScreen({ onBack }: AuditLogScreenProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    loadAuditLogs().then(setLogs);
  }, []);

  const summary = useMemo(() => ({
    success: logs.filter((log) => log.status === 'success').length,
    warning: logs.filter((log) => log.status === 'warning').length,
    error: logs.filter((log) => log.status === 'error').length,
  }), [logs]);

  return (
    <ScreenShell title="İşlem Geçmişi" subtitle={`Son ${logs.length} terminal işlemi`} onBack={onBack}>
      <View style={styles.summaryPanel}>
        <InfoItem label="Başarılı" value={summary.success.toString()} tone="success" />
        <InfoItem label="Uyarı" value={summary.warning.toString()} tone="warning" />
        <InfoItem label="Hata" value={summary.error.toString()} tone="error" />
      </View>

      {logs.length === 0 ? (
        <EmptyState badge="LOG" title="İşlem kaydı yok" description="Müşteri, fiş ve barkod işlemleri burada listelenir." />
      ) : (
        logs.map((log) => (
          <View key={log.id} style={[styles.logCard, log.status === 'error' && styles.errorCard, log.status === 'warning' && styles.warningCard]}>
            <View style={[styles.accent, log.status === 'success' && styles.successAccent, log.status === 'warning' && styles.warningAccent, log.status === 'error' && styles.errorAccent]} />
            <View style={styles.cardTop}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.operationType}>{log.operationType}</Text>
                <Text style={styles.createdAt}>{formatDateTime(log.createdAt)}</Text>
              </View>
              <StatusPill label={labelForStatus(log.status)} tone={toneForStatus(log.status)} />
            </View>
            <View style={styles.metaGrid}>
              <InfoItem label="Fiş" value={log.documentNo || '-'} />
              <InfoItem label="Müşteri" value={log.customerName || '-'} />
            </View>
            <Text style={styles.description}>{log.description}</Text>
            <Text style={styles.deviceText}>{log.deviceName} · {log.personnelName}</Text>
          </View>
        ))
      )}
    </ScreenShell>
  );
}

function InfoItem({ label, value, tone }: { label: string; value: string; tone?: AuditLogStatus }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText, tone === 'error' && styles.errorText]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryPanel: { flexDirection: 'row', gap: spacing.xs },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  warningCard: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7' },
  errorCard: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.anthracite },
  successAccent: { backgroundColor: colors.success },
  warningAccent: { backgroundColor: colors.amber },
  errorAccent: { backgroundColor: colors.red },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardTitleBlock: { flex: 1, gap: 2 },
  operationType: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  createdAt: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  metaGrid: { flexDirection: 'row', gap: spacing.xs },
  infoItem: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  description: { color: colors.text, fontSize: typography.body, fontWeight: '800', lineHeight: 17 },
  deviceText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  successText: { color: colors.success },
  warningText: { color: colors.amber },
  errorText: { color: colors.red },
});
