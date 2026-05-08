import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InfoCard } from '../../components/InfoCard';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage } from '../../components/ToastMessage';
import { getFailedOperationsMock, getMessagesMock, getOpenDocumentsMock } from '../../services/api';
import { loadActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft } from '../../types';
import type { AppScreen, OpenDocument, UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
  systemMessage?: string;
};

const modules: Array<{ label: string; description: string; screen: AppScreen; code: string }> = [
  { label: 'Açık Fişler', description: 'Bekleyen fişler', screen: 'openDocuments', code: 'AÇK' },
  { label: 'QR Albüm', description: 'Ürün görselleri', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', description: 'Operasyon notları', screen: 'messages', code: 'MSG' },
  { label: 'Gönderilemeyenler', description: 'Kuyruk işlemleri', screen: 'failedQueue', code: 'ERR' },
  { label: 'Veri Güncelle', description: 'Ürün ve stok', screen: 'dataUpdate', code: 'SYN' },
  { label: 'Ayarlar', description: 'Terminal bilgileri', screen: 'settings', code: 'SET' },
];

export function DashboardScreen({ session, onNavigate, systemMessage }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSync] = useState('Bugün 09:40');
  const [activeDraft, setActiveDraft] = useState<ActiveSaleDraft | null>(null);

  useEffect(() => {
    getMessagesMock().then((messages) => setUnreadCount(messages.filter((message) => !message.read).length));
    getOpenDocumentsMock().then(setDocuments);
    getFailedOperationsMock().then((operations) => setFailedCount(operations.length));
    loadActiveSaleDraft().then(setActiveDraft);
  }, []);

  const personName = session?.username || 'Personel';
  const hasActiveDraft = Boolean(activeDraft);
  const activeItemCount = activeDraft?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

  return (
    <View style={styles.container}>
      <TerminalHeader terminalId="T01" branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 44 }]}>
        <ToastMessage message={systemMessage} tone="info" />
        <View style={styles.welcome}>
          <View>
            <Text style={styles.welcomeTitle}>Hoş geldin, {personName}</Text>
            <Text style={styles.welcomeSubtitle}>Bugünkü işlemler hazır</Text>
          </View>
          <View style={styles.terminalBadge}>
            <Text style={styles.terminalBadgeText}>T01</Text>
          </View>
        </View>

        <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.startSale, pressed && styles.pressed]}>
          <View>
            <Text style={styles.startSaleText}>+ Yeni Fiş Başlat</Text>
            <Text style={styles.startSaleHint}>Müşteri seç, fişi aç, ürünleri ekle</Text>
          </View>
          <View style={styles.startArrow}>
            <Text style={styles.startArrowText}>›</Text>
          </View>
        </Pressable>

        <View style={styles.summaryGrid}>
          <SummaryBox label="Açık Fiş" value={documents.length.toString()} />
          <SummaryBox label="Mesaj" value={unreadCount.toString()} tone={unreadCount > 0 ? 'danger' : 'dark'} />
          <SummaryBox label="Kuyruk" value={failedCount.toString()} tone={failedCount > 0 ? 'warning' : 'dark'} />
          <SummaryBox label="Son Senkron" value={lastSync} wide />
        </View>

        <InfoCard title="Son aktif fiş">
          {hasActiveDraft && activeDraft ? (
            <>
              <View style={styles.documentHeader}>
                <Text style={styles.documentNo}>{activeDraft.documentNo}</Text>
                <StatusPill label={`${activeItemCount} ürün`} tone="dark" />
              </View>
              <View style={styles.activeDocRow}>
                <View style={styles.activeMeta}>
                  <Text style={styles.customerLabel}>Müşteri</Text>
                  <Text style={styles.customerName}>{activeDraft.customerName}</Text>
                </View>
                <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
                  <Text style={styles.continueText}>Devam Et</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.activeDocRow}>
              <View style={styles.activeMeta}>
                <Text style={styles.documentNoMuted}>Aktif fiş yok</Text>
                <Text style={styles.customerName}>Yeni fiş başlatabilirsin</Text>
              </View>
              <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
                <Text style={styles.continueText}>Yeni Fiş Başlat</Text>
              </Pressable>
            </View>
          )}
        </InfoCard>

        <View style={styles.menuGrid}>
          {modules.map((module) => (
            <Pressable key={module.screen} onPress={() => onNavigate(module.screen)} style={({ pressed }) => [styles.module, pressed && styles.pressed]}>
              <View style={styles.moduleAccent} />
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

        <InfoCard title="Güvenli çalışma modu" subtitle="Terminal hazır. Veriler cihazda korunur." tone="dark" />
      </ScrollView>
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: string;
  tone?: 'dark' | 'danger' | 'warning';
  wide?: boolean;
};

function SummaryBox({ label, value, tone = 'dark', wide = false }: SummaryBoxProps) {
  return (
    <View style={[styles.summaryBox, wide && styles.summaryWide]}>
      <Text style={[styles.summaryValue, tone === 'danger' && styles.summaryDanger, tone === 'warning' && styles.summaryWarning]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  welcome: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.subtle,
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: 2,
  },
  terminalBadge: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.md,
    minWidth: 44,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
  },
  terminalBadgeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.section,
  },
  startSale: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.redDark,
    borderBottomWidth: 3,
    borderBottomColor: colors.anthracite,
    ...shadows.subtle,
  },
  pressed: {
    opacity: 0.86,
  },
  startSaleText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  startSaleHint: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: 2,
  },
  startArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startArrowText: {
    color: colors.red,
    fontSize: 26,
    lineHeight: 27,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryBox: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.anthracite,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    ...shadows.subtle,
  },
  summaryWide: {
    minWidth: '64%',
    borderTopColor: colors.red,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  summaryDanger: {
    color: colors.red,
  },
  summaryWarning: {
    color: colors.amber,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
    marginTop: 2,
  },
  menuGrid: {
    gap: spacing.xs,
  },
  module: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  moduleAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.red,
  },
  codeBox: {
    width: 40,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  moduleTextBlock: {
    flex: 1,
    gap: 2,
  },
  moduleText: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  moduleDescription: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  activeDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  documentNo: {
    color: colors.red,
    fontSize: typography.section,
    fontWeight: '900',
  },
  documentNoMuted: {
    color: colors.muted,
    fontSize: typography.section,
    fontWeight: '900',
  },
  activeMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  customerLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  customerName: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  continueButton: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 38,
    justifyContent: 'center',
  },
  continueText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
});
