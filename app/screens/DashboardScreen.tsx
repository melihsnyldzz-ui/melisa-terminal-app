import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { getMessagesMock } from '../../services/api';
import type { AppScreen, UserSession } from '../../types';
import { colors } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
};

export function DashboardScreen({ session, onNavigate }: DashboardScreenProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getMessagesMock().then((messages) => setUnreadCount(messages.filter((message) => !message.read).length));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>MELİSA BEBE</Text>
        <Text style={styles.title}>Terminal Ana Menü</Text>
        <Text style={styles.session}>{session?.username ?? 'Personel'} · {session?.branch ?? 'Depo'} · v0.1.0</Text>
      </View>
      <View style={styles.menu}>
        <AppButton label="Yeni Fiş / Satış" onPress={() => onNavigate('newSale')} />
        <AppButton label="Açık Fişler" onPress={() => onNavigate('openDocuments')} />
        <AppButton label="QR Albüm" onPress={() => onNavigate('qrAlbum')} />
        <AppButton label="Mesajlar" badge={unreadCount} onPress={() => onNavigate('messages')} />
        <AppButton label="Gönderilemeyenler" onPress={() => onNavigate('failedQueue')} variant="secondary" />
        <AppButton label="Veri Güncelle" onPress={() => onNavigate('dataUpdate')} variant="secondary" />
        <AppButton label="Ayarlar" onPress={() => onNavigate('settings')} variant="dark" />
      </View>
      <View style={styles.note}>
        <Text style={styles.noteTitle}>v0.1 güvenli çalışma</Text>
        <Text style={styles.noteText}>Mock data ve local storage kullanılır. Gerçek Vega / SQL yazma işlemi yoktur.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.softWhite },
  header: { backgroundColor: colors.red, padding: 18, gap: 4 },
  brand: { color: colors.white, fontSize: 16, fontWeight: '900' },
  title: { color: colors.white, fontSize: 25, fontWeight: '900' },
  session: { color: colors.white, fontSize: 14, fontWeight: '700' },
  menu: { padding: 14, gap: 10 },
  note: { margin: 14, padding: 14, borderRadius: 8, backgroundColor: colors.white, borderLeftWidth: 5, borderLeftColor: colors.black },
  noteTitle: { color: colors.black, fontWeight: '900', fontSize: 16 },
  noteText: { color: colors.gray, fontWeight: '700', lineHeight: 20, marginTop: 4 },
});
