import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { clearOfflineActions, loadOfflineActions, removeOfflineAction, removeOfflineActionsByStatus } from '../../storage/offlineQueueStorage';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { colors, radius, spacing, typography } from '../theme';

type OfflineQueueScreenProps = {
  onBack: () => void;
};

const actionLabels: Record<OfflineQueueAction['actionType'], string> = {
  printRetry: 'Print retry',
  pendingSaleCompletion: 'Satış tamamlama',
};

const statusLabels: Record<OfflineQueueAction['status'], string> = {
  pending: 'Bekleyen',
  error: 'Hata',
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const compactJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Payload okunamadı';
  }
};

export function OfflineQueueScreen({ onBack }: OfflineQueueScreenProps) {
  const insets = useSafeAreaInsets();
  const [actions, setActions] = useState<OfflineQueueAction[]>([]);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [jsonActionId, setJsonActionId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    const savedActions = await loadOfflineActions();
    setActions(savedActions);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const summary = useMemo(() => ({
    total: actions.length,
    pending: actions.filter((action) => action.status === 'pending').length,
    error: actions.filter((action) => action.status === 'error').length,
    printRetry: actions.filter((action) => action.actionType === 'printRetry').length,
    saleCompletion: actions.filter((action) => action.actionType === 'pendingSaleCompletion').length,
  }), [actions]);

  const confirmDelete = (action: OfflineQueueAction) => {
    Alert.alert(
      'Kaydı sil',
      `${action.documentNo || action.id} offline queue kaydı silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await removeOfflineAction(action.id);
            setExpandedActionId((current) => (current === action.id ? null : current));
            setJsonActionId((current) => (current === action.id ? null : current));
            await loadQueue();
          },
        },
      ],
    );
  };

  const confirmClearErrors = () => {
    Alert.alert(
      'Hataları temizle',
      'Tüm error durumundaki offline queue kayıtları silinsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await removeOfflineActionsByStatus('error');
            setExpandedActionId(null);
            setJsonActionId(null);
            await loadQueue();
          },
        },
      ],
    );
  };

  const confirmClearAll = () => {
    Alert.alert(
      'Tüm queue temizlensin',
      'Bekleyen ve hatalı tüm offline queue kayıtları silinsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tümünü Temizle',
          style: 'destructive',
          onPress: async () => {
            await clearOfflineActions();
            setExpandedActionId(null);
            setJsonActionId(null);
            await loadQueue();
          },
        },
      ],
    );
  };

  const renderAction = ({ item }: { item: OfflineQueueAction }) => (
    <OfflineQueueCard
      action={item}
      expanded={expandedActionId === item.id}
      showJson={jsonActionId === item.id}
      onToggleDetail={() => setExpandedActionId((current) => (current === item.id ? null : item.id))}
      onToggleJson={() => setJsonActionId((current) => (current === item.id ? null : item.id))}
      onDelete={() => confirmDelete(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TerminalHeader onBack={onBack} />
      <View style={styles.header}>
        <Text style={styles.title}>Offline Kuyruk</Text>
        <Text style={styles.subtitle}>Debug / admin görünümü</Text>
      </View>

      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={renderAction}
        contentContainerStyle={[styles.content, actions.length === 0 && styles.emptyContent, { paddingBottom: insets.bottom + 76 }]}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={(
          <View style={styles.headerContent}>
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Altyapı modu</Text>
              <Text style={styles.noticeText}>Bu ekran yalnızca local queue durumunu gösterir. Auto retry, background sync ve gerçek write-back bu sürümde çalışmaz.</Text>
            </View>

            <View style={styles.summaryGrid}>
              <InfoBox label="Toplam" value={summary.total.toString()} />
              <InfoBox label="Pending" value={summary.pending.toString()} tone="warning" />
              <InfoBox label="Error" value={summary.error.toString()} tone="danger" />
              <InfoBox label="Print retry" value={summary.printRetry.toString()} />
              <InfoBox label="Sale completion" value={summary.saleCompletion.toString()} />
            </View>

            <View style={styles.adminActions}>
              <AppButton label="Error Kayıtlarını Temizle" onPress={confirmClearErrors} variant="secondary" compact />
              <AppButton label="Tüm Queue'yu Temizle" onPress={confirmClearAll} variant="dark" compact />
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState badge="SYNC" title="Offline işlem yok" description="Bağlantı hatası alınırsa hazırlanmış işlemler burada listelenir." />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppButton label="Ana Menüye Dön" onPress={onBack} variant="dark" compact />
      </View>
    </View>
  );
}

function OfflineQueueCard({ action, expanded, showJson, onToggleDetail, onToggleJson, onDelete }: {
  action: OfflineQueueAction;
  expanded: boolean;
  showJson: boolean;
  onToggleDetail: () => void;
  onToggleJson: () => void;
  onDelete: () => void;
}) {
  const isError = action.status === 'error';

  return (
    <View style={[styles.card, isError ? styles.cardError : styles.cardPending]}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.documentNo}>{action.documentNo || action.id}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{action.customerName || 'Müşteri yok'}</Text>
        </View>
        <StatusPill label={statusLabels[action.status]} tone={isError ? 'danger' : 'warning'} />
      </View>

      <View style={styles.metricRow}>
        <InfoBox label="İşlem tipi" value={actionLabels[action.actionType]} />
        <InfoBox label="Retry" value={action.retryCount.toString()} />
      </View>
      <View style={styles.metricRow}>
        <InfoBox label="CreatedAt" value={formatDate(action.createdAt)} />
        <InfoBox label="LastTriedAt" value={formatDate(action.retry.lastTriedAt)} />
      </View>

      <View style={styles.errorInfoBox}>
        <Text style={styles.errorTitle}>LastError</Text>
        <Text style={styles.errorText}>{action.lastError || action.retry.lastError || '-'}</Text>
      </View>

      {expanded ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>Detay</Text>
          <Text style={styles.detailText}>ID: {action.id}</Text>
          <Text style={styles.detailText}>Durum: {action.status}</Text>
          <Text style={styles.detailText}>UpdatedAt: {formatDate(action.updatedAt)}</Text>
          {action.retry.nextRetryAfter ? <Text style={styles.detailText}>NextRetryAfter: {formatDate(action.retry.nextRetryAfter)}</Text> : null}
        </View>
      ) : null}

      {showJson ? (
        <View style={styles.jsonBox}>
          <Text style={styles.detailTitle}>JSON Payload</Text>
          <Text style={styles.jsonText}>{compactJson(action.payload)}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <SmallButton label={expanded ? 'Detayı Kapat' : 'Detay'} onPress={onToggleDetail} />
        <SmallButton label={showJson ? 'JSON Gizle' : 'JSON'} onPress={onToggleJson} />
        <SmallButton label="Sil" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallButton, danger && styles.smallButtonDanger, pressed && styles.pressed]}>
      <Text style={[styles.smallButtonText, danger && styles.smallButtonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'danger' && styles.infoDanger, tone === 'warning' && styles.infoWarning]} numberOfLines={1}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '900', marginTop: 1 },
  subtitle: { color: colors.muted, fontSize: typography.body, fontWeight: '700', marginTop: 2 },
  content: { padding: spacing.sm, gap: spacing.sm },
  emptyContent: { flexGrow: 1 },
  headerContent: { gap: spacing.sm },
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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  adminActions: { gap: spacing.xs },
  infoBox: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  infoDanger: { color: colors.red },
  infoWarning: { color: colors.amber },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardPending: { borderColor: '#efd5a7', borderLeftWidth: 4, borderLeftColor: colors.amber },
  cardError: { borderColor: '#f3bcc5', borderLeftWidth: 4, borderLeftColor: colors.red },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: spacing.xs },
  errorInfoBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  errorTitle: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  errorText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  detailBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  detailTitle: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  detailText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  jsonBox: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    padding: spacing.xs,
    gap: 2,
  },
  jsonText: { color: colors.surface, fontSize: 10, fontWeight: '700', lineHeight: 14 },
  actionRow: { flexDirection: 'row', gap: spacing.xs },
  smallButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  smallButtonDanger: { borderColor: colors.red, backgroundColor: colors.dangerSoft },
  smallButtonText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  smallButtonTextDanger: { color: colors.red },
  footer: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pressed: { opacity: 0.86 },
});
