import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getMessagesMock } from '../../services/api';
import type { Message } from '../../types';
import { colors } from '../theme';

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
    <ScreenShell title="Mesajlar" subtitle={`${unreadCount} okunmamış mock mesaj`} onBack={onBack}>
      {messages.map((message) => (
        <InfoCard key={message.id} title={`${message.type} · ${message.title}`} subtitle={message.body} tone={message.type === 'Acil' ? 'danger' : message.read ? 'default' : 'warning'}>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{message.timeLabel}</Text>
            <Text style={[styles.state, !message.read && styles.unread]}>{message.read ? 'Okundu' : 'Okunmadı'}</Text>
          </View>
          {message.relatedDocument ? <Text style={styles.document}>Bağlı fiş: {message.relatedDocument}</Text> : null}
        </InfoCard>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  meta: { color: colors.gray, fontWeight: '800' },
  state: { color: colors.green, fontWeight: '900' },
  unread: { color: colors.red },
  document: { color: colors.black, fontWeight: '800' },
});
