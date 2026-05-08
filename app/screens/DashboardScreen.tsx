import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { getFailedOperationsMock, getMessagesMock, getOpenDocumentsMock } from '../../services/api';
import { loadActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft } from '../../types';
import type { AppScreen, OpenDocument, UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
};

const modules: Array<{ label: string; description: string; screen: AppScreen; code: string }> = [
  { label: 'Açık Fişler', description: 'Bekleyen satışları yönet', screen: 'openDocuments', code: 'FİŞ' },
  { label: 'QR Albüm', description: 'Müşteri ürün görselleri', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', description: 'Merkez ve operasyon notları', screen: 'messages', code: 'MSG' },
  { label: 'Gönderilemeyenler', description: 'Kuyruktaki işlemleri izle', screen: 'failedQueue', code: 'ERR' },
  { label: 'Veri Güncelle', description: 'Ürün ve stok hazırlığı', screen: 'dataUpdate', code: 'SYN' },
  { label: 'Ayarlar', description: 'Terminal bilgileri', screen: 'settings', code: 'SET' },
];

export function DashboardScreen({ session, onNavigate }: DashboardScreenProps) {
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
  const activeDocumentNo = activeDraft?.documentNo ?? documents[0]?.id ?? 'FIS-1024';
  const activeCustomer = activeDraft?.customerName ?? documents[0]?.customerName ?? 'ABC Baby Store';
  const activeItemCount = activeDraft?.lines.length ?? documents[0]?.itemCount ?? 8;

  return (
    <View style={styles.container}>
      <TerminalHeader terminalId="T01" branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView contentContainerStyle={styles.content}>
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

        <InfoCard title="Son aktif fiş" subtitle={`${activeDocumentNo} · ${activeCustomer}`}>
          <View style={styles.activeDocRow}>
            <View style={styles.activeMeta}>
              <StatusPill label={`${activeItemCount} ürün`} tone="dark" />
              <Text style={styles.activeHint}>Taslaklar cihazda saklanır</Text>
            </View>
            <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
              <Text style={styles.continueText}>Devam Et</Text>
            </Pressable>
          </View>
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
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  welcome: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
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
    marginTop: 3,
  },
  terminalBadge: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.md,
    minWidth: 48,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
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
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.redDark,
    ...shadows.subtle,
  },
  pressed: {
    opacity: 0.86,
  },
  startSaleText: {
    color: colors.surface,
    fontSize: 21,
    fontWeight: '900',
  },
  startSaleHint: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: 3,
  },
  startArrow: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startArrowText: {
    color: colors.red,
    fontSize: 31,
    lineHeight: 32,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryBox: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    borderTopWidth: 3,
    borderTopColor: colors.anthracite,
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
    gap: spacing.sm,
  },
  module: {
    minHeight: 68,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    width: 46,
    height: 40,
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
  activeMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  activeHint: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  continueButton: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 42,
    justifyContent: 'center',
  },
  continueText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
});
