import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getMessagesMock } from '../../services/api';
import { notifyMessage, notifySuccess, notifyUrgent, notifyWarning } from '../../services/feedback';
import type { Message } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type MessagesScreenProps = {
  onBack: () => void;
};

type MessageFilter = 'Tümü' | 'Acil' | 'Fiş Notu' | 'Okunmamış';

const filters: MessageFilter[] = ['Tümü', 'Acil', 'Fiş Notu', 'Okunmamış'];
const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export function MessagesScreen({ onBack }: MessagesScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<MessageFilter>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getMessagesMock().then((nextMessages) => {
      setMessages(nextMessages);
      if (nextMessages.some((message) => message.type === 'Acil' && !message.read)) {
        notifyUrgent();
      }
    });
  }, []);

  const statusFilteredMessages = useMemo(() => {
    if (filter === 'Acil') return messages.filter((message) => message.type === 'Acil');
    if (filter === 'Fiş Notu') return messages.filter((message) => message.type === 'Fiş Notu');
    if (filter === 'Okunmamış') return messages.filter((message) => !message.read);
    return messages;
  }, [filter, messages]);

  const filteredMessages = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return statusFilteredMessages;

    return statusFilteredMessages.filter((message) => {
      const searchable = `${message.title} ${message.body} ${message.sender} ${message.type} ${message.relatedDocument ?? ''}`;
      return normalizeSearchText(searchable).includes(query);
    });
  }, [searchQuery, statusFilteredMessages]);

  useEffect(() => {
    if (filter === 'Acil' && filteredMessages.some((message) => message.type === 'Acil' && !message.read)) {
      notifyUrgent();
    }
  }, [filter, filteredMessages]);

  const selectedMessage = messages.find((message) => message.id === selectedId);
  const unreadCount = messages.filter((message) => !message.read).length;
  const urgentCount = messages.filter((message) => message.type === 'Acil' && !message.read).length;
  const documentLinkedCount = messages.filter((message) => Boolean(message.relatedDocument)).length;

  const markSelectedRead = () => {
    if (!selectedMessage) {
      setBanner({ message: 'Önce bir mesaj seç.', tone: 'warning' });
      notifyWarning();
      return;
    }

    setMessages((current) => current.map((message) => (message.id === selectedMessage.id ? { ...message, read: true } : message)));
    setBanner({ message: `${selectedMessage.title} okundu olarak işaretlendi.`, tone: 'success' });
    notifySuccess();
  };

  const goToDocument = () => {
    if (!selectedMessage?.relatedDocument) return;
    setBanner({ message: `${selectedMessage.relatedDocument} fiş yönlendirmesi hazır.`, tone: 'info' });
    notifyMessage();
  };

  const selectMessage = (message: Message) => {
    setSelectedId(message.id);
    if (message.type === 'Acil' && !message.read) {
      notifyUrgent();
      return;
    }
    notifyMessage();
  };

  return (
    <ScreenShell title="Mesajlar" subtitle={`${unreadCount} okunmamış · ${urgentCount} acil`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      {urgentCount > 0 ? (
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentBannerTitle}>Acil mesaj var</Text>
          <Text style={styles.urgentBannerText}>Öncelikli operasyon notlarını kontrol edin.</Text>
        </View>
      ) : null}

      <View style={styles.searchPanel}>
        <Text style={styles.searchLabel}>Mesaj / fiş ara</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Başlık, fiş no veya gönderen yaz"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.operationSummary}>
        <MessageMetric label="Görünen" value={filteredMessages.length.toString()} />
        <MessageMetric label="Fişe bağlı" value={documentLinkedCount.toString()} />
        <MessageMetric label="Acil" value={urgentCount.toString()} tone={urgentCount > 0 ? 'warning' : 'dark'} />
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterButton, filter === item && styles.activeFilter]}>
            <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {filteredMessages.length === 0 ? (
        <EmptyState badge="MSG" title="Mesaj bulunamadı" description="Arama metnini veya filtreyi değiştir." />
      ) : (
        filteredMessages.map((message) => (
          <Pressable key={message.id} onPress={() => selectMessage(message)} style={[styles.messageRow, message.type === 'Acil' && styles.urgentRow, selectedId === message.id && styles.selectedRow]}>
            <View style={[styles.rowAccent, message.type === 'Acil' && styles.rowAccentUrgent]} />
            <View style={styles.messageHeader}>
              <View style={styles.typeGroup}>
                <StatusPill label={message.type} tone={statusToneFor(message.type)} />
                {message.relatedDocument ? <Text style={styles.documentText}>{message.relatedDocument}</Text> : null}
              </View>
              <Text style={styles.time}>{message.timeLabel}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{message.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{message.body}</Text>
            <View style={styles.metaRow}>
              <StatusPill label={message.read ? 'Okundu' : 'Okunmadı'} tone={statusToneFor(message.read ? 'Okundu' : 'Okunmadı')} />
              <Text style={styles.sender}>{message.sender}</Text>
            </View>
          </Pressable>
        ))
      )}

      {selectedMessage ? (
        <View style={[styles.detailCard, selectedMessage.type === 'Acil' && styles.detailCardUrgent]}>
          <View style={styles.detailTop}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailTitle}>{selectedMessage.title}</Text>
              <Text style={styles.detailMeta}>{selectedMessage.sender} · {selectedMessage.timeLabel}</Text>
            </View>
            <StatusPill label={selectedMessage.read ? 'Okundu' : 'Okunmadı'} tone={statusToneFor(selectedMessage.read ? 'Okundu' : 'Okunmadı')} />
          </View>
          <View style={styles.detailBadgeRow}>
            <StatusPill label={selectedMessage.type} tone={statusToneFor(selectedMessage.type)} />
            {selectedMessage.relatedDocument ? <StatusPill label={selectedMessage.relatedDocument} tone="dark" /> : null}
          </View>
          <Text style={styles.detailText}>{selectedMessage.body}</Text>
          <ActionRow actions={[{ label: 'Okundu işaretle', onPress: markSelectedRead, variant: 'primary' }]} />
          {selectedMessage.relatedDocument ? (
            <ActionRow actions={[{ label: 'Fişe Git', onPress: goToDocument, variant: 'dark' }]} />
          ) : null}
        </View>
      ) : null}
    </ScreenShell>
  );
}

function MessageMetric({ label, value, tone = 'dark' }: { label: string; value: string; tone?: 'dark' | 'warning' }) {
  return (
    <View style={styles.messageMetric}>
      <Text style={[styles.messageMetricValue, tone === 'warning' && styles.messageMetricWarning]}>{value}</Text>
      <Text style={styles.messageMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  searchLabel: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  searchInput: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.sm,
    fontWeight: '800',
  },
  operationSummary: { flexDirection: 'row', gap: spacing.xs },
  messageMetric: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopWidth: 3,
    borderTopColor: colors.anthracite,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    gap: 2,
  },
  messageMetricValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  messageMetricWarning: { color: colors.red },
  messageMetricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterButton: {
    flexGrow: 1,
    minWidth: '23%',
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilter: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  activeFilterText: { color: colors.surface },
  urgentBanner: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  urgentBannerTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  urgentBannerText: { color: colors.text, fontSize: typography.small, fontWeight: '800' },
  messageRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  urgentRow: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  selectedRow: { borderColor: colors.anthracite, borderWidth: 2 },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.anthracite },
  rowAccentUrgent: { backgroundColor: colors.red },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  typeGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  documentText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  sender: { flex: 1, color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  time: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  body: { color: colors.text, fontSize: typography.body, lineHeight: 17, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.anthracite,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  detailCardUrgent: { borderLeftColor: colors.red, backgroundColor: colors.dangerSoft },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  detailTitleBlock: { flex: 1, gap: 2 },
  detailTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  detailMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  detailBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  detailText: { color: colors.text, fontSize: typography.body, fontWeight: '700', lineHeight: 18 },
});
