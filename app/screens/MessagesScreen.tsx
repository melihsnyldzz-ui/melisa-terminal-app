import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getMessagesMock } from '../../services/api';
import type { Message } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type MessagesScreenProps = {
  onBack: () => void;
};

export function MessagesScreen({ onBack }: MessagesScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const unreadCount = messages.filter((message) => !message.read).length;

  useEffect(() => {
    getMessagesMock().then(setMessages);
  }, []);

  return (
    <ScreenShell title="Mesaj Merkezi" subtitle={`${unreadCount} okunmamış iş mesajı`} onBack={onBack}>
      <InfoCard title="İş mesajları" subtitle="Acil, merkez, muhasebe, depo ve fiş notları tek listede izlenir." />
      {messages.map((message) => (
        <View key={message.id} style={[styles.messageRow, message.type === 'Acil' && styles.urgentRow]}>
          <View style={[styles.typePill, message.type === 'Acil' && styles.urgentPill]}>
            <Text style={[styles.typeText, message.type === 'Acil' && styles.urgentTypeText]}>{message.type}</Text>
          </View>
          <View style={styles.messageBody}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{message.title}</Text>
              <Text style={styles.time}>{message.timeLabel}</Text>
            </View>
            <Text style={styles.body}>{message.body}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.state, !message.read && styles.unread]}>{message.read ? 'Okundu' : 'Okunmadı'}</Text>
              {message.relatedDocument ? <Text style={styles.document}>{message.relatedDocument}</Text> : null}
            </View>
          </View>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  urgentRow: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.red,
  },
  typePill: {
    width: 58,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentPill: {
    backgroundColor: colors.red,
  },
  typeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  urgentTypeText: {
    color: colors.surface,
  },
  messageBody: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  time: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  body: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 19,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  state: {
    color: colors.success,
    fontSize: typography.small,
    fontWeight: '900',
  },
  unread: {
    color: colors.red,
  },
  document: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '900',
  },
});
