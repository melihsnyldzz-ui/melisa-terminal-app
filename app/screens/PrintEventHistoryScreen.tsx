import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { clearPrintEvents, loadPrintEvents } from '../../storage/printEventStorage';
import type { PrintEvent, PrintEventType } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PrintEventHistoryScreenProps = {
  onBack: () => void;
};

type FilterKey = 'all' | 'success' | 'error' | 'attempt';

const filterLabels: Record<FilterKey, string> = {
  all: 'Tümü',
  success: 'Başarılı',
  error: 'Hatalı',
  attempt: 'Deneme',
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

const isSuccessEvent = (event: PrintEvent) => event.eventType === 'printSuccess' || event.eventType === 'retrySuccess';
const isErrorEvent = (event: PrintEvent) => event.eventType === 'printError' || event.eventType === 'retryError';
const isAttemptEvent = (event: PrintEvent) => event.eventType === 'printAttempt' || event.eventType === 'retryAttempt';

const eventTone = (event: PrintEvent) => {
  if (isSuccessEvent(event)) return 'success';
  if (isErrorEvent(event)) return 'danger';
  if (isAttemptEvent(event)) return 'warning';
  return 'neutral';
};

const bridgeLabel = (value: PrintEvent['bridgeStatus']) => {
  if (value === 'connected') return 'Bağlı';
  if (value === 'disconnected') return 'Bağlı değil';
  return 'Bilinmiyor';
};

export function PrintEventHistoryScreen({ onBack }: PrintEventHistoryScreenProps) {
  const [events, setEvents] = useState<PrintEvent[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');

  const loadEvents = async () => {
    const savedEvents = await loadPrintEvents();
    setEvents([...savedEvents].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const summary = useMemo(() => ({
    total: events.length,
    success: events.filter(isSuccessEvent).length,
    error: events.filter(isErrorEvent).length,
    attempt: events.filter(isAttemptEvent).length,
  }), [events]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (filter === 'success') return isSuccessEvent(event);
    if (filter === 'error') return isErrorEvent(event);
    if (filter === 'attempt') return isAttemptEvent(event);
    return true;
  }), [events, filter]);

  const confirmClear = () => {
    Alert.alert(
      'Geçmişi temizle',
      'Tüm yazdırma olay geçmişi silinsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await clearPrintEvents();
            setEvents([]);
          },
        },
      ],
    );
  };

  return (
    <ScreenShell title="Yazdırma Geçmişi" subtitle={`${filteredEvents.length} olay görüntüleniyor`} onBack={onBack}>
      <View style={styles.summaryGrid}>
        <InfoBox label="Toplam" value={summary.total.toString()} />
        <InfoBox label="Başarılı" value={summary.success.toString()} tone="success" />
        <InfoBox label="Hatalı" value={summary.error.toString()} tone="danger" />
        <InfoBox label="Deneme" value={summary.attempt.toString()} tone="warning" />
      </View>

      <View style={styles.filterRow}>
        {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={({ pressed }) => [styles.filterButton, filter === key && styles.filterButtonActive, pressed && styles.pressed]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{filterLabels[key]}</Text>
          </Pressable>
        ))}
      </View>

      <AppButton label="Tüm geçmişi temizle" onPress={confirmClear} variant="secondary" compact />

      {filteredEvents.length === 0 ? (
        <EmptyState badge="PRN" title="Yazdırma olayı yok" description="Yazdırma denemeleri, başarıları ve hataları burada listelenir." />
      ) : (
        filteredEvents.map((event) => <PrintEventCard key={event.id} event={event} />)
      )}
    </ScreenShell>
  );
}

function PrintEventCard({ event }: { event: PrintEvent }) {
  const tone = eventTone(event);
  const isError = tone === 'danger';

  return (
    <View style={[styles.eventCard, isError && styles.eventCardError]}>
      <View style={[styles.accent, tone === 'success' && styles.successAccent, tone === 'warning' && styles.warningAccent, tone === 'danger' && styles.errorAccent]} />
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.eventTitle}>{eventLabels[event.eventType]}</Text>
          <Text style={styles.eventDate}>{formatDate(event.createdAt)}</Text>
        </View>
        <StatusPill label={eventLabels[event.eventType]} tone={tone === 'neutral' ? 'info' : tone} />
      </View>

      <View style={styles.metaGrid}>
        <InfoBox label="Fiş" value={event.documentNo || event.draftId || event.printJobId || '-'} />
        <InfoBox label="Bridge" value={bridgeLabel(event.bridgeStatus)} tone={event.bridgeStatus === 'connected' ? 'success' : event.bridgeStatus === 'disconnected' ? 'danger' : undefined} />
        <InfoBox label="Retry" value={(event.retryCount || 0).toString()} />
      </View>

      <Text style={styles.message}>{event.message}</Text>
      {event.errorMessage ? <Text style={styles.errorText}>{event.errorMessage}</Text> : null}
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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterButton: {
    flexGrow: 1,
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  filterTextActive: { color: colors.surface },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  eventCardError: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.anthracite },
  successAccent: { backgroundColor: colors.success },
  warningAccent: { backgroundColor: colors.amber },
  errorAccent: { backgroundColor: colors.red },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardTitleBlock: { flex: 1, gap: 2 },
  eventTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  eventDate: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  metaGrid: { flexDirection: 'row', gap: spacing.xs },
  infoBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoDanger: { color: colors.red },
  infoWarning: { color: colors.amber },
  infoSuccess: { color: colors.success },
  message: { color: colors.text, fontSize: typography.body, fontWeight: '800', lineHeight: 17 },
  errorText: { color: colors.red, fontSize: typography.small, fontWeight: '900', lineHeight: 15 },
  pressed: { opacity: 0.86 },
});
