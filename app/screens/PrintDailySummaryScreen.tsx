import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { PrintEvent, PrintEventType } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PrintDailySummaryScreenProps = {
  onBack: () => void;
};

const eventLabels: Record<PrintEventType, string> = {
  created: 'Kuyruğa eklendi',
  printAttempt: 'Yazdırma denendi',
  printSuccess: 'Yazdırıldı',
  printError: 'Yazdırma hatası',
  retryAttempt: 'Tekrar denendi',
  retrySuccess: 'Tekrar başarılı',
  retryError: 'Tekrar hata',
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

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const sortNewestFirst = (events: PrintEvent[]) => [...events].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

const eventTone = (event: PrintEvent) => {
  if (event.eventType === 'printSuccess' || event.eventType === 'retrySuccess') return 'success';
  if (event.eventType === 'printError' || event.eventType === 'retryError') return 'danger';
  if (event.eventType === 'printAttempt' || event.eventType === 'retryAttempt') return 'warning';
  return 'info';
};

const bridgeLabel = (value: PrintEvent['bridgeStatus']) => {
  if (value === 'connected') return 'Bağlı';
  if (value === 'disconnected') return 'Bağlı değil';
  return 'Bilinmiyor';
};

export function PrintDailySummaryScreen({ onBack }: PrintDailySummaryScreenProps) {
  const [events, setEvents] = useState<PrintEvent[]>([]);

  useEffect(() => {
    loadPrintEvents().then((savedEvents) => setEvents(sortNewestFirst(savedEvents.filter((event) => isToday(event.createdAt)))));
  }, []);

  const summary = useMemo(() => ({
    total: events.length,
    printSuccess: events.filter((event) => event.eventType === 'printSuccess').length,
    printError: events.filter((event) => event.eventType === 'printError' || event.eventType === 'retryError').length,
    retryAttempt: events.filter((event) => event.eventType === 'retryAttempt').length,
    retrySuccess: events.filter((event) => event.eventType === 'retrySuccess').length,
    unreachableBridge: events.filter((event) => event.bridgeStatus === 'disconnected').length,
  }), [events]);

  const hasError = summary.printError > 0 || summary.unreachableBridge > 0;
  const latestEvents = events.slice(0, 10);

  return (
    <ScreenShell title="Günlük Yazdırma Özeti" subtitle="Tarih filtresi: Bugün" onBack={onBack}>
      <View style={[styles.noticeBox, hasError ? styles.noticeDanger : styles.noticeSuccess]}>
        <Text style={[styles.noticeTitle, hasError ? styles.noticeDangerText : styles.noticeSuccessText]}>
          {hasError ? 'Bugün yazdırma hatası var.' : 'Bugün yazdırma tarafında sorun görünmüyor.'}
        </Text>
        <Text style={styles.noticeText}>Bu özet sadece bugünkü yazdırma olay kayıtlarından hesaplanır.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Toplam olay" value={summary.total.toString()} />
        <InfoBox label="Yazdırıldı" value={summary.printSuccess.toString()} tone="success" />
        <InfoBox label="Hata" value={summary.printError.toString()} tone={summary.printError > 0 ? 'danger' : undefined} />
        <InfoBox label="Tekrar deneme" value={summary.retryAttempt.toString()} tone="warning" />
        <InfoBox label="Tekrar başarılı" value={summary.retrySuccess.toString()} tone="success" />
        <InfoBox label="PC ulaşılamadı" value={summary.unreachableBridge.toString()} tone={summary.unreachableBridge > 0 ? 'danger' : undefined} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Son 10 olay</Text>
        <StatusPill label="Bugün" tone={hasError ? 'warning' : 'success'} />
      </View>

      {latestEvents.length === 0 ? (
        <EmptyState badge="GÜN" title="Bugün olay yok" description="Bugün yazdırma denemesi, başarı veya hata kaydı yok." />
      ) : (
        latestEvents.map((event) => <DailyEventRow key={event.id} event={event} />)
      )}
    </ScreenShell>
  );
}

function DailyEventRow({ event }: { event: PrintEvent }) {
  const tone = eventTone(event);
  const isError = tone === 'danger';

  return (
    <View style={[styles.eventRow, isError && styles.eventRowError]}>
      <View style={styles.eventTop}>
        <View style={styles.eventMain}>
          <Text style={styles.eventTitle}>{eventLabels[event.eventType]}</Text>
          <Text style={styles.eventDate}>{formatDate(event.createdAt)} · {event.documentNo || event.draftId || event.printJobId || '-'}</Text>
        </View>
        <StatusPill label={bridgeLabel(event.bridgeStatus)} tone={event.bridgeStatus === 'connected' ? 'success' : event.bridgeStatus === 'disconnected' ? 'danger' : 'info'} />
      </View>
      <Text style={styles.eventMessage}>{event.message}</Text>
      <Text style={styles.eventMeta}>Retry: {event.retryCount || 0}</Text>
      {event.errorMessage ? <Text style={styles.eventError}>{event.errorMessage}</Text> : null}
    </View>
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: 2,
  },
  noticeDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.red, borderLeftColor: colors.red },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  noticeTitle: { fontSize: typography.body, fontWeight: '900' },
  noticeDangerText: { color: colors.red },
  noticeSuccessText: { color: colors.success },
  noticeText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  infoBox: {
    width: '48.7%',
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
  eventRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  eventRowError: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  eventMain: { flex: 1, gap: 2 },
  eventTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  eventDate: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  eventMessage: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  eventMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  eventError: { color: colors.red, fontSize: typography.small, fontWeight: '900', lineHeight: 15 },
});
