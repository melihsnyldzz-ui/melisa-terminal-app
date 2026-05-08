import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getMessagesMock } from '../../services/api';
import type { Message } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type MessagesScreenProps = {
  onBack: () => void;
};

type MessageFilter = 'Tümü' | 'Acil' | 'Fiş Notu' | 'Okunmamış';

const filters: MessageFilter[] = ['Tümü', 'Acil', 'Fiş Notu', 'Okunmamış'];

export function MessagesScreen({ onBack }: MessagesScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<MessageFilter>('Tümü');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getMessagesMock().then(setMessages);
  }, []);

  const filteredMessages = useMemo(() => {
    if (filter === 'Acil') return messages.filter((message) => message.type === 'Acil');
    if (filter === 'Fiş Notu') return messages.filter((message) => message.type === 'Fiş Notu');
    if (filter === 'Okunmamış') return messages.filter((message) => !message.read);
    return messages;
  }, [filter, messages]);

  const selectedMessage = messages.find((message) => message.id === selectedId);

  const markSelectedRead = () => {
    if (!selectedMessage) {
      setBanner({ message: 'Önce bir mesaj seç.', tone: 'warning' });
      return;
    }

    setMessages((current) => current.map((message) => (message.id === selectedMessage.id ? { ...message, read: true } : message)));
    setBanner({ message: `${selectedMessage.title} okundu olarak işaretlendi.`, tone: 'success' });
  };

  return (
    <ScreenShell title="Mesaj Merkezi" subtitle="İş odaklı terminal mesajları" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterButton, filter === item && styles.activeFilter]}>
            <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {filteredMessages.length === 0 ? (
        <EmptyState badge="MSG" title="Bu filtrede mesaj yok" description="Filtreyi değiştirerek diğer iş mesajlarını görüntüleyebilirsin." />
      ) : (
        filteredMessages.map((message) => (
          <Pressable key={message.id} onPress={() => setSelectedId(message.id)} style={[styles.messageRow, message.type === 'Acil' && styles.urgentRow, selectedId === message.id && styles.selectedRow]}>
            <View style={styles.messageHeader}>
              <Text style={styles.sender}>{message.sender} · {message.type}</Text>
              <Text style={styles.time}>{message.timeLabel}</Text>
            </View>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.body}>{message.body}</Text>
            <View style={styles.metaRow}>
              <StatusPill label={message.read ? 'Okundu' : 'Okunmadı'} tone={statusToneFor(message.read ? 'Okundu' : 'Okunmadı')} />
              {message.relatedDocument ? <StatusPill label={message.relatedDocument} tone="dark" /> : null}
            </View>
          </Pressable>
        ))
      )}

      {selectedMessage ? (
        <InfoCard title="Seçili mesaj detayı" subtitle={`${selectedMessage.sender} · ${selectedMessage.timeLabel}`}>
          <Text style={styles.detailText}>{selectedMessage.body}</Text>
          <ActionRow actions={[{ label: 'Okundu işaretle', onPress: markSelectedRead, variant: 'primary' }]} />
          {selectedMessage.relatedDocument ? (
            <ActionRow actions={[{ label: 'Fişe Git', onPress: () => setBanner({ message: `${selectedMessage.relatedDocument} mock fiş yönlendirmesi hazır.`, tone: 'info' }), variant: 'dark' }]} />
          ) : null}
        </InfoCard>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeFilter: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  activeFilterText: { color: colors.surface },
  messageRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  urgentRow: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  selectedRow: { borderColor: colors.anthracite, borderWidth: 2 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  sender: { flex: 1, color: colors.red, fontSize: typography.small, fontWeight: '900' },
  time: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  body: { color: colors.text, fontSize: typography.body, lineHeight: 19, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  detailText: { color: colors.text, fontSize: typography.body, fontWeight: '700', lineHeight: 20 },
});
