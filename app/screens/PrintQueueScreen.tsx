import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { checkPrintBridgeHealth, sendSaleReceiptToPrintBridge } from '../../services/api';
import type { PrintBridgeResult } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addOfflineAction, createPrintRetryOfflineAction } from '../../storage/offlineQueueStorage';
import { addAuditLog, loadSalePrintJobs, saveSalePrintJobs } from '../../storage/localStorage';
import { addPrintEvent, loadPrintEvents } from '../../storage/printEventStorage';
import type { PrintEvent, SalePrintJob } from '../../types';
import { formatMoney, normalizeCurrencyCode } from '../utils/currencyUtils';
import { formatBridgeCheckedAt, toPrintBridgeHealthView } from '../utils/printBridgeHealthUtils';
import { colors, radius, spacing, typography } from '../theme';

type PrintQueueScreenProps = {
  onBack: () => void;
};

type FilterKey = 'all' | SalePrintJob['status'];

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'Yazdırma bekliyor', label: 'Bekleyen' },
  { key: 'Yazdırıldı', label: 'Yazdırıldı' },
  { key: 'Yazdırma hatası', label: 'Hata' },
];

const statusLabels: Record<SalePrintJob['status'], string> = {
  'Yazdırma bekliyor': 'Bekliyor',
  'Yazdırıldı': 'Yazdırıldı',
  'Yazdırma hatası': 'Hata aldı',
};

const statusTones: Record<SalePrintJob['status'], 'success' | 'warning' | 'danger'> = {
  'Yazdırma bekliyor': 'warning',
  'Yazdırıldı': 'success',
  'Yazdırma hatası': 'danger',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getPrintJobDisplayStatus = (job: SalePrintJob) => {
  if ((job.retryCount || 0) > 0 && job.status !== 'Yazdırma hatası') return 'Tekrar denendi';
  return statusLabels[job.status];
};

const sanitizePrintError = (value?: string) => {
  if (!value) return undefined;
  if (value.toLowerCase().includes('network') || value.toLowerCase().includes('http') || value.toLowerCase().includes('abort')) {
    return 'Yazdırma bilgisayarına ulaşılamıyor. Servis açık değil veya ağ bağlantısı yok.';
  }
  return value;
};

const printEventLabels: Record<PrintEvent['eventType'], string> = {
  created: 'Oluşturuldu',
  printAttempt: 'Yazdırma denendi',
  printSuccess: 'Yazdırıldı',
  printError: 'Yazdırma hatası',
  retryAttempt: 'Tekrar denendi',
  retrySuccess: 'Tekrar başarılı',
  retryError: 'Tekrar hatası',
};

export function PrintQueueScreen({ onBack }: PrintQueueScreenProps) {
  const [jobs, setJobs] = useState<SalePrintJob[]>([]);
  const [printEvents, setPrintEvents] = useState<PrintEvent[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [bridgeHealth, setBridgeHealth] = useState<PrintBridgeResult | null>(null);
  const [bridgeChecking, setBridgeChecking] = useState(false);
  const [bridgeCheckedAt, setBridgeCheckedAt] = useState<string | undefined>(undefined);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [printingJobId, setPrintingJobId] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
    refreshHealth();
  }, []);

  const loadQueue = async () => {
    const [savedJobs, savedEvents] = await Promise.all([loadSalePrintJobs(), loadPrintEvents()]);
    setJobs(savedJobs);
    setPrintEvents(savedEvents);
  };

  const refreshHealth = async () => {
    setBridgeChecking(true);
    const result = await checkPrintBridgeHealth();
    setBridgeHealth(result);
    setBridgeCheckedAt(new Date().toISOString());
    setBridgeChecking(false);
    return result;
  };

  const visibleJobs = useMemo(() => {
    if (filter === 'all') return jobs;
    return jobs.filter((job) => job.status === filter);
  }, [filter, jobs]);

  const summary = useMemo(() => ({
    waiting: jobs.filter((job) => job.status === 'Yazdırma bekliyor').length,
    printed: jobs.filter((job) => job.status === 'Yazdırıldı').length,
    error: jobs.filter((job) => job.status === 'Yazdırma hatası').length,
  }), [jobs]);
  const bridgeView = toPrintBridgeHealthView(bridgeHealth, bridgeChecking, bridgeCheckedAt);

  const updateJob = async (jobId: string, patch: Partial<SalePrintJob>) => {
    const nextJobs = jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job));
    setJobs(nextJobs);
    await saveSalePrintJobs(nextJobs);
  };

  const reprint = async (job: SalePrintJob) => {
    if (printingJobId) return;
    setPrintingJobId(job.id);
    const now = new Date().toISOString();
    const nextRetryCount = (job.retryCount || 0) + 1;
    await addPrintEvent({
      printJobId: job.id,
      draftId: job.documentNo,
      documentNo: job.documentNo,
      eventType: 'retryAttempt',
      message: `${job.documentNo} için tekrar yazdırma denendi.`,
      bridgeStatus: 'unknown',
      retryCount: nextRetryCount,
    });
    const health = await refreshHealth();
    if (!health.ok) {
      await addPrintEvent({
        printJobId: job.id,
        draftId: job.documentNo,
        documentNo: job.documentNo,
        eventType: 'retryError',
        message: 'Yazdırma bilgisayarına ulaşılamadığı için tekrar yazdırma yapılmadı.',
        bridgeStatus: 'disconnected',
        retryCount: nextRetryCount,
        errorMessage: 'Servis açık değil veya ağ bağlantısı yok.',
      });
      await loadQueue();
      setBanner({ message: 'Yazdırma bilgisayarına ulaşılamıyor. Servis açık değil veya ağ bağlantısı yok.', tone: 'warning' });
      notifyWarning();
      setPrintingJobId(null);
      return;
    }
    const result = await sendSaleReceiptToPrintBridge(job);

    if (result.ok) {
      await updateJob(job.id, {
        status: 'Yazdırıldı',
        errorMessage: undefined,
        lastError: undefined,
        retryCount: nextRetryCount,
        lastBridgeStatus: 'connected',
        lastTriedAt: now,
        printedAt: now,
      });
      await addPrintEvent({
        printJobId: job.id,
        draftId: job.documentNo,
        documentNo: job.documentNo,
        eventType: 'retrySuccess',
        message: `${job.documentNo} tekrar yazdırıldı.`,
        bridgeStatus: 'connected',
        retryCount: nextRetryCount,
      });
      await addAuditLog({
        operationType: 'PC bridge’e gönderildi',
        customerName: job.customerName,
        documentNo: job.documentNo,
        description: `${job.documentNo} yeniden yazdırma için gönderildi. ${result.endpoint}`,
        status: 'success',
      });
      setBanner({ message: `${job.documentNo} yeniden yazdırıldı.`, tone: 'success' });
      notifySuccess();
    } else {
      const errorMessage = result.reason || result.message;
      await updateJob(job.id, {
        status: 'Yazdırma hatası',
        errorMessage: sanitizePrintError(errorMessage),
        lastError: sanitizePrintError(errorMessage),
        retryCount: nextRetryCount,
        lastBridgeStatus: 'disconnected',
        lastTriedAt: now,
      });
      await addPrintEvent({
        printJobId: job.id,
        draftId: job.documentNo,
        documentNo: job.documentNo,
        eventType: 'retryError',
        message: `${job.documentNo} tekrar yazdırılamadı.`,
        bridgeStatus: 'disconnected',
        retryCount: nextRetryCount,
        errorMessage: sanitizePrintError(errorMessage),
      });
      await addOfflineAction(createPrintRetryOfflineAction({ ...job, status: 'Yazdırma hatası', errorMessage: sanitizePrintError(errorMessage), lastError: sanitizePrintError(errorMessage), retryCount: nextRetryCount, lastBridgeStatus: 'disconnected', lastTriedAt: now }, sanitizePrintError(errorMessage)));
      await addAuditLog({
        operationType: 'Hata oluştu',
        customerName: job.customerName,
        documentNo: job.documentNo,
        description: `${job.documentNo} yeniden yazdırılamadı. ${errorMessage}`,
        status: 'error',
      });
      setBanner({ message: `${job.documentNo} yazdırılamadı.`, tone: 'error' });
      notifyWarning();
    }

    await loadQueue();
    setPrintingJobId(null);
  };

  return (
    <ScreenShell title="Yazdırma Kuyruğu" subtitle={`${jobs.length} yazdırma işi`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.healthPanel}>
        <View style={styles.healthTextBlock}>
          <Text style={styles.healthTitle}>Yazdırma bilgisayarı</Text>
          <Text style={styles.healthText} numberOfLines={2}>{bridgeView.message}</Text>
          <Text style={styles.healthReason} numberOfLines={1}>Son kontrol: {formatBridgeCheckedAt(bridgeView.checkedAt)}</Text>
          {bridgeView.reason ? <Text style={styles.healthReason} numberOfLines={2}>{bridgeView.reason}</Text> : null}
        </View>
        <View style={styles.healthSide}>
          <StatusPill label={bridgeView.label} tone={bridgeView.status === 'connected' ? 'success' : bridgeView.status === 'checking' ? 'warning' : 'danger'} />
          <Pressable onPress={refreshHealth} style={({ pressed }) => [styles.healthButton, pressed && styles.pressed]}>
            <Text style={styles.healthButtonText}>Kontrol</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <InfoItem label="Bekleyen" value={summary.waiting.toString()} />
        <InfoItem label="Yazdırıldı" value={summary.printed.toString()} />
        <InfoItem label="Hata" value={summary.error.toString()} />
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable key={item.key} onPress={() => setFilter(item.key)} style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.pressed]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {visibleJobs.length === 0 ? (
        <EmptyState badge="PRN" title="Yazdırma işi yok" description="Fiş onaylanınca yazdırma kuyruğuna düşer." />
      ) : (
        visibleJobs.map((job) => (
          <PrintJobCard
            key={job.id}
            job={job}
            events={printEvents.filter((event) => event.printJobId === job.id)}
            expanded={expandedJobId === job.id}
            busy={printingJobId === job.id}
            onToggle={() => setExpandedJobId((current) => (current === job.id ? null : job.id))}
            onReprint={() => reprint(job)}
          />
        ))
      )}
    </ScreenShell>
  );
}

function PrintJobCard({ job, events, expanded, busy, onToggle, onReprint }: {
  job: SalePrintJob;
  events: PrintEvent[];
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onReprint: () => void;
}) {
  const currency = normalizeCurrencyCode(job.saleCurrency || job.currency);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.documentNo}>{job.documentNo}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{job.customerName}</Text>
        </View>
        <StatusPill label={getPrintJobDisplayStatus(job)} tone={statusTones[job.status]} />
      </View>

      <View style={styles.metricRow}>
        <InfoItem label="Oluşturma" value={formatDate(job.createdAt)} />
        <InfoItem label="Kalem" value={job.lineCount.toString()} />
        <InfoItem label="Adet" value={job.totalQuantity.toString()} />
      </View>
      <View style={styles.metricRow}>
        <InfoItem label="Toplam" value={formatMoney(job.totalAmount, currency)} wide />
        <InfoItem label="Deneme" value={(job.retryCount || 0).toString()} />
      </View>
      <View style={styles.metricRow}>
        <InfoItem label="Son deneme" value={job.lastTriedAt ? formatDate(job.lastTriedAt) : '-'} />
        <InfoItem label="Bridge" value={job.lastBridgeStatus === 'connected' ? 'Bağlı' : job.lastBridgeStatus === 'disconnected' ? 'Bağlı değil' : 'Bilinmiyor'} />
      </View>

      {(job.lastError || job.errorMessage) ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Son hata</Text>
          <Text style={styles.errorText}>{sanitizePrintError(job.lastError || job.errorMessage)}</Text>
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>Fiş detayı</Text>
          <Text style={styles.detailText}>Müşteri: {job.customerName}</Text>
          <Text style={styles.detailText}>Fiş no: {job.documentNo}</Text>
          <Text style={styles.detailText}>Toplam: {formatMoney(job.totalAmount, currency)}</Text>
          <Text style={styles.detailText}>Kalem: {job.lineCount} · Adet: {job.totalQuantity}</Text>
          <Text style={styles.detailText}>Oluşturma: {formatDate(job.createdAt)}</Text>
          <Text style={styles.detailText}>Son deneme: {job.lastTriedAt ? formatDate(job.lastTriedAt) : '-'}</Text>
          <Text style={styles.detailText}>Yazdırma: {job.printedAt ? formatDate(job.printedAt) : '-'}</Text>
          <Text style={styles.detailText}>Tekrar deneme: {job.retryCount || 0}</Text>
          <Text style={styles.detailText}>Son durum: {getPrintJobDisplayStatus(job)}</Text>
          <Text style={styles.detailText}>Son hata: {sanitizePrintError(job.lastError || job.errorMessage) || '-'}</Text>
          {job.deviceName ? <Text style={styles.detailText}>Cihaz: {job.deviceName}</Text> : null}
          {job.createdByName ? <Text style={styles.detailText}>Operator: {job.createdByName}{job.createdByCode ? ` · ${job.createdByCode}` : ''}</Text> : null}
          <View style={styles.eventPanel}>
            <Text style={styles.detailTitle}>Olay geçmişi</Text>
            {events.length === 0 ? (
              <Text style={styles.detailText}>Bu fiş için olay kaydı yok.</Text>
            ) : (
              events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventTitle}>{printEventLabels[event.eventType]} · {formatDate(event.createdAt)}</Text>
                  <Text style={styles.eventText}>{event.message}</Text>
                  <Text style={styles.eventMeta}>Bridge: {event.bridgeStatus === 'connected' ? 'Bağlı' : event.bridgeStatus === 'disconnected' ? 'Bağlı değil' : 'Bilinmiyor'} · Deneme: {event.retryCount || 0}</Text>
                  {event.errorMessage ? <Text style={styles.eventError}>{event.errorMessage}</Text> : null}
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}

      <ActionRow
        actions={[
          { label: expanded ? 'Detayı Kapat' : 'Detay Gör', onPress: onToggle, variant: 'secondary' },
          { label: busy ? 'Gönderiliyor' : 'Tekrar Yazdır', onPress: onReprint, variant: 'primary' },
        ]}
      />
    </View>
  );
}

function InfoItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.infoItem, wide && styles.infoItemWide]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  healthPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  healthTextBlock: { flex: 1, gap: 2 },
  healthTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  healthText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  healthReason: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  healthSide: { alignItems: 'flex-end', gap: spacing.xs },
  healthButton: {
    minHeight: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthButtonText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: spacing.xs },
  filterRow: { flexDirection: 'row', gap: spacing.xs },
  filterButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  filterTextActive: { color: colors.surface },
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
  infoItem: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoItemWide: { minWidth: '48%' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
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
  eventPanel: { marginTop: spacing.xs, gap: spacing.xs },
  eventRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  eventTitle: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  eventText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  eventMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  eventError: { color: colors.red, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  pressed: { opacity: 0.86 },
});
