import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { checkPrintBridgeHealth, sendSaleReceiptToPrintBridge } from '../../services/api';
import type { PrintBridgeResult } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { clearOfflineActions, loadOfflineActions, removeOfflineAction, removeOfflineActionsByStatus, updateOfflineAction } from '../../storage/offlineQueueStorage';
import { addPrintEvent } from '../../storage/printEventStorage';
import type { OfflineQueueAction } from '../offline/offlineQueueTypes';
import { getRetryPlan } from '../offline/retryScheduler';
import { formatBridgeCheckedAt, toPrintBridgeHealthView } from '../utils/printBridgeHealthUtils';
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

const retryStateLabels = {
  eligible: 'Retry uygun',
  waiting: 'Retry bekliyor',
  blocked: 'Retry bloklandı',
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
  const [retryingActionId, setRetryingActionId] = useState<string | null>(null);
  const [bridgeHealth, setBridgeHealth] = useState<PrintBridgeResult | null>(null);
  const [bridgeChecking, setBridgeChecking] = useState(false);
  const [bridgeCheckedAt, setBridgeCheckedAt] = useState<string | undefined>(undefined);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const loadQueue = useCallback(async () => {
    const savedActions = await loadOfflineActions();
    setActions(savedActions);
  }, []);

  useEffect(() => {
    loadQueue();
    refreshBridgeHealth();
  }, [loadQueue]);

  const refreshBridgeHealth = async () => {
    setBridgeChecking(true);
    const result = await checkPrintBridgeHealth();
    setBridgeHealth(result);
    setBridgeCheckedAt(new Date().toISOString());
    setBridgeChecking(false);
    return result;
  };

  const summary = useMemo(() => ({
    total: actions.length,
    pending: actions.filter((action) => action.status === 'pending').length,
    error: actions.filter((action) => action.status === 'error').length,
    printRetry: actions.filter((action) => action.actionType === 'printRetry').length,
    saleCompletion: actions.filter((action) => action.actionType === 'pendingSaleCompletion').length,
    retryEligible: actions.filter((action) => getRetryPlan(action).retryState === 'eligible').length,
    retryWaiting: actions.filter((action) => getRetryPlan(action).retryState === 'waiting').length,
    retryBlocked: actions.filter((action) => getRetryPlan(action).retryState === 'blocked').length,
  }), [actions]);
  const bridgeView = toPrintBridgeHealthView(bridgeHealth, bridgeChecking, bridgeCheckedAt);

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

  const manualRetry = async (action: OfflineQueueAction) => {
    const retryPlan = getRetryPlan(action);
    if (!retryPlan.retryEligible || retryingActionId) return;

    if (action.payload.type === 'pendingSaleCompletion') {
      setBanner({ message: 'Satış tamamlama retry akışı henüz desteklenmiyor.', tone: 'warning' });
      notifyWarning();
      return;
    }

    setRetryingActionId(action.id);
    setBanner({ message: `${action.documentNo || action.id} tekrar deneniyor.`, tone: 'info' });
    const nextRetryCount = action.retryCount + 1;
    await addPrintEvent({
      printJobId: action.payload.printJob.id,
      draftId: action.documentNo,
      documentNo: action.documentNo,
      eventType: 'retryAttempt',
      message: `${action.documentNo || action.id} offline kuyruktan tekrar denendi.`,
      bridgeStatus: 'unknown',
      retryCount: nextRetryCount,
    });
    const health = await refreshBridgeHealth();
    if (!health.ok) {
      await addPrintEvent({
        printJobId: action.payload.printJob.id,
        draftId: action.documentNo,
        documentNo: action.documentNo,
        eventType: 'retryError',
        message: 'Yazdırma bilgisayarı kapalı olduğu için offline retry yapılmadı.',
        bridgeStatus: 'disconnected',
        retryCount: nextRetryCount,
        errorMessage: 'Servis açık değil veya ağ bağlantısı yok.',
      });
      setBanner({ message: 'Yazdırma bilgisayarına ulaşılamıyor. Servis açık değil veya ağ bağlantısı yok.', tone: 'warning' });
      notifyWarning();
      setRetryingActionId(null);
      return;
    }
    const result = await sendSaleReceiptToPrintBridge(action.payload.printJob);

    if (result.ok) {
      await addPrintEvent({
        printJobId: action.payload.printJob.id,
        draftId: action.documentNo,
        documentNo: action.documentNo,
        eventType: 'retrySuccess',
        message: `${action.documentNo || action.id} offline kuyruktan başarıyla gönderildi.`,
        bridgeStatus: 'connected',
        retryCount: nextRetryCount,
      });
      await removeOfflineAction(action.id);
      setExpandedActionId((current) => (current === action.id ? null : current));
      setJsonActionId((current) => (current === action.id ? null : current));
      setBanner({ message: `${action.documentNo || action.id} başarıyla tekrar gönderildi.`, tone: 'success' });
      notifySuccess();
      await loadQueue();
      setRetryingActionId(null);
      return;
    }

    const now = new Date().toISOString();
    const safeLastError = 'Yazdırma bilgisayarına ulaşılamıyor. Servis açık değil veya ağ bağlantısı yok.';
    await addPrintEvent({
      printJobId: action.payload.printJob.id,
      draftId: action.documentNo,
      documentNo: action.documentNo,
      eventType: 'retryError',
      message: `${action.documentNo || action.id} offline kuyruktan gönderilemedi.`,
      bridgeStatus: 'disconnected',
      retryCount: nextRetryCount,
      errorMessage: safeLastError,
    });
    await updateOfflineAction(action.id, {
      status: 'error',
      retryCount: nextRetryCount,
      lastError: safeLastError,
      retry: {
        ...action.retry,
        retryCount: nextRetryCount,
        lastTriedAt: now,
        lastError: safeLastError,
      },
      payload: {
        type: 'printRetry',
        printJob: {
          ...action.payload.printJob,
          status: 'Yazdırma hatası',
          retryCount: nextRetryCount,
          lastTriedAt: now,
          lastError: safeLastError,
          errorMessage: safeLastError,
          lastBridgeStatus: 'disconnected',
        },
      },
    });
    setBanner({ message: `${action.documentNo || action.id} tekrar denemesi başarısız.`, tone: 'error' });
    notifyWarning();
    await loadQueue();
    setRetryingActionId(null);
  };

  const renderAction = ({ item }: { item: OfflineQueueAction }) => (
    <OfflineQueueCard
      action={item}
      expanded={expandedActionId === item.id}
      showJson={jsonActionId === item.id}
      onToggleDetail={() => setExpandedActionId((current) => (current === item.id ? null : item.id))}
      onToggleJson={() => setJsonActionId((current) => (current === item.id ? null : item.id))}
      onRetry={() => manualRetry(item)}
      onDelete={() => confirmDelete(item)}
      retrying={retryingActionId === item.id}
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
              <Text style={styles.noticeText}>Bu ekran local queue durumunu gösterir. Auto retry, background sync ve gerçek write-back bu sürümde çalışmaz; uygun kayıtlar sadece elle denenir.</Text>
            </View>
            <ToastMessage message={banner?.message} tone={banner?.tone} />

            <View style={styles.bridgeBox}>
              <View style={styles.bridgeTextBlock}>
                <Text style={styles.bridgeTitle}>Yazdırma bilgisayarı</Text>
                <Text style={styles.bridgeText} numberOfLines={2}>{bridgeView.message}</Text>
                <Text style={styles.bridgeMeta}>Son kontrol: {formatBridgeCheckedAt(bridgeView.checkedAt)}</Text>
                {bridgeView.reason ? <Text style={styles.bridgeMeta} numberOfLines={2}>{bridgeView.reason}</Text> : null}
              </View>
              <View style={styles.bridgeSide}>
                <StatusPill label={bridgeView.label} tone={bridgeView.status === 'connected' ? 'success' : bridgeView.status === 'checking' ? 'warning' : 'danger'} />
                <SmallButton label="Kontrol" onPress={refreshBridgeHealth} />
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <InfoBox label="Toplam" value={summary.total.toString()} />
              <InfoBox label="Pending" value={summary.pending.toString()} tone="warning" />
              <InfoBox label="Error" value={summary.error.toString()} tone="danger" />
              <InfoBox label="Print retry" value={summary.printRetry.toString()} />
              <InfoBox label="Sale completion" value={summary.saleCompletion.toString()} />
              <InfoBox label="Retry uygun" value={summary.retryEligible.toString()} tone="success" />
              <InfoBox label="Retry bekliyor" value={summary.retryWaiting.toString()} tone="warning" />
              <InfoBox label="Retry blok" value={summary.retryBlocked.toString()} tone="danger" />
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

function OfflineQueueCard({ action, expanded, showJson, retrying, onToggleDetail, onToggleJson, onRetry, onDelete }: {
  action: OfflineQueueAction;
  expanded: boolean;
  showJson: boolean;
  retrying: boolean;
  onToggleDetail: () => void;
  onToggleJson: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const isError = action.status === 'error';
  const retryPlan = getRetryPlan(action);
  const retryTone = retryPlan.retryState === 'eligible' ? 'success' : retryPlan.retryState === 'waiting' ? 'warning' : 'danger';

  return (
    <View style={[styles.card, isError ? styles.cardError : styles.cardPending]}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.documentNo}>{action.documentNo || action.id}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{action.customerName || 'Müşteri yok'}</Text>
        </View>
        <View style={styles.statusStack}>
          <StatusPill label={statusLabels[action.status]} tone={isError ? 'danger' : 'warning'} />
          <StatusPill label={retryStateLabels[retryPlan.retryState]} tone={retryTone} />
        </View>
      </View>

      <View style={styles.metricRow}>
        <InfoBox label="İşlem tipi" value={actionLabels[action.actionType]} />
        <InfoBox label="Retry" value={action.retryCount.toString()} />
      </View>
      <View style={styles.metricRow}>
        <InfoBox label="CreatedAt" value={formatDate(action.createdAt)} />
        <InfoBox label="LastTriedAt" value={formatDate(action.retry.lastTriedAt)} />
      </View>
      <View style={styles.metricRow}>
        <InfoBox label="NextRetryAt" value={formatDate(action.nextRetryAt || retryPlan.nextRetryAt)} />
        <InfoBox label="Max retry" value={retryPlan.maxRetryExceeded ? 'Aşıldı' : 'Uygun'} tone={retryPlan.maxRetryExceeded ? 'danger' : 'success'} />
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
          <Text style={styles.detailText}>Retry durumu: {retryStateLabels[retryPlan.retryState]}</Text>
          <Text style={styles.detailText}>Retry uygun: {retryPlan.retryEligible ? 'Evet' : 'Hayır'}</Text>
          <Text style={styles.detailText}>Retry zamanı geldi: {retryPlan.retryDue ? 'Evet' : 'Hayır'}</Text>
          <Text style={styles.detailText}>Retry bloklandı: {retryPlan.retryBlocked ? 'Evet' : 'Hayır'}</Text>
          <Text style={styles.detailText}>NextRetryAt: {formatDate(action.nextRetryAt || retryPlan.nextRetryAt)}</Text>
          <Text style={styles.detailText}>Policy delay: {retryPlan.delayMs ? `${Math.round(retryPlan.delayMs / 1000)} sn` : '-'}</Text>
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
        {retryPlan.retryEligible ? <SmallButton label={retrying ? 'Deneniyor' : 'Tekrar Dene'} onPress={onRetry} success disabled={retrying} /> : null}
        <SmallButton label="Sil" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress, danger = false, success = false, disabled = false }: { label: string; onPress: () => void; danger?: boolean; success?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.smallButton, danger && styles.smallButtonDanger, success && styles.smallButtonSuccess, disabled && styles.smallButtonDisabled, pressed && !disabled && styles.pressed]}>
      <Text style={[styles.smallButtonText, danger && styles.smallButtonTextDanger, success && styles.smallButtonTextSuccess]}>{label}</Text>
    </Pressable>
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
  bridgeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.anthracite,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bridgeTextBlock: { flex: 1, gap: 2 },
  bridgeTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  bridgeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  bridgeMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  bridgeSide: { alignItems: 'flex-end', gap: spacing.xs },
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
  infoSuccess: { color: colors.success },
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
  statusStack: { alignItems: 'flex-end', gap: spacing.xs },
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
  smallButtonSuccess: { borderColor: colors.success, backgroundColor: colors.successSoft },
  smallButtonDisabled: { opacity: 0.55 },
  smallButtonText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  smallButtonTextDanger: { color: colors.red },
  smallButtonTextSuccess: { color: colors.success },
  footer: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pressed: { opacity: 0.86 },
});
