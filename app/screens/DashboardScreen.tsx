import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { getFailedOperationsMock, getMessagesMock, getOpenDocumentsMock } from '../../services/api';
import type { AppScreen, OpenDocument, UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
};

const modules: Array<{ label: string; description: string; screen: AppScreen; code: string }> = [
  { label: 'Açık Fişler', description: 'Bekleyen satışları yönet', screen: 'openDocuments', code: 'AÇK' },
  { label: 'QR Albüm', description: 'Müşteri görsel albümü', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', description: 'Merkez ve muhasebe bildirimleri', screen: 'messages', code: 'MSG' },
  { label: 'Gönderilemeyenler', description: 'Kuyrukta kalan işlemler', screen: 'failedQueue', code: 'ERR' },
  { label: 'Veri Güncelle', description: 'Mock stok yenileme', screen: 'dataUpdate', code: 'SYN' },
  { label: 'Ayarlar', description: 'Terminal ve bağlantı ayarları', screen: 'settings', code: 'SET' },
];

export function DashboardScreen({ session, onNavigate }: DashboardScreenProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSync] = useState('Bugün 09:40');

  useEffect(() => {
    getMessagesMock().then((messages) => setUnreadCount(messages.filter((message) => !message.read).length));
    getOpenDocumentsMock().then(setDocuments);
    getFailedOperationsMock().then((operations) => setFailedCount(operations.length));
  }, []);

  return (
    <View style={styles.container}>
      <TerminalHeader terminalId="T01" branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>ANA OPERASYON</Text>
          <Text style={styles.title}>Terminal Ana Ekranı</Text>
          <Text style={styles.subtitle}>Hızlı işlem, açık fiş ve mesaj kontrolleri</Text>
        </View>

        <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.startSale, pressed && styles.pressed]}>
          <Text style={styles.startSaleText}>+ Yeni Fiş Başlat</Text>
          <Text style={styles.startSaleHint}>Müşteri seç, fişi aç, ürünleri ekle</Text>
        </Pressable>

        <View style={styles.summaryGrid}>
          <SummaryBox label="Açık fiş" value={documents.length.toString()} />
          <SummaryBox label="Okunmamış" value={unreadCount.toString()} />
          <SummaryBox label="Kuyruk" value={failedCount.toString()} />
          <SummaryBox label="Son senkron" value={lastSync} wide />
        </View>

        <View style={styles.menuGrid}>
          {modules.map((module) => (
            <Pressable key={module.screen} onPress={() => onNavigate(module.screen)} style={({ pressed }) => [styles.module, pressed && styles.pressed]}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{module.code}</Text>
              </View>
              <View style={styles.moduleTextBlock}>
                <Text style={styles.moduleText}>{module.label}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              {module.screen === 'messages' && unreadCount > 0 ? <StatusPill label={unreadCount.toString()} tone="danger" /> : null}
            </Pressable>
          ))}
        </View>

        <InfoCard title="Güvenli v0.2 mod" subtitle="Mock data ve local storage kullanılır. Gerçek Vega / SQL yazma işlemi yoktur." tone="dark" />
      </ScrollView>
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: string;
  wide?: boolean;
};

function SummaryBox({ label, value, wide = false }: SummaryBoxProps) {
  return (
    <View style={[styles.summaryBox, wide && styles.summaryWide]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { gap: 2 },
  kicker: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: typography.body, fontWeight: '700' },
  startSale: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  startSaleText: { color: colors.surface, fontSize: 19, fontWeight: '900' },
  startSaleHint: { color: colors.surface, fontSize: typography.body, fontWeight: '700' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryBox: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryWide: { minWidth: '64%' },
  summaryValue: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '800', marginTop: 2 },
  menuGrid: { gap: spacing.sm },
  module: {
    minHeight: 66,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.subtle,
  },
  pressed: { opacity: 0.82 },
  codeBox: {
    width: 44,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { color: colors.surface, fontWeight: '900', fontSize: typography.small },
  moduleTextBlock: { flex: 1, gap: 2 },
  moduleText: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  moduleDescription: { color: colors.muted, fontSize: typography.small, fontWeight: '700' },
});
