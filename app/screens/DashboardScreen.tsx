import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage } from '../../components/ToastMessage';
import { checkPrintBridgeHealth, getFailedOperationsMock, getMessagesMock, getOpenDocumentsMock } from '../../services/api';
import { loadOfflineActions } from '../../storage/offlineQueueStorage';
import { loadActiveSaleDraft, loadFailedOperationsSnapshot, loadSaleDrafts, loadSalePrintJobs, saveFailedOperations } from '../../storage/localStorage';
import { loadPrintEvents } from '../../storage/printEventStorage';
import type { ActiveSaleDraft } from '../../types';
import type { AppScreen, OpenDocument, PersonnelUser, UserSession } from '../../types';
import { canOpenScreen } from '../utils/permissionUtils';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  currentUser: PersonnelUser | null;
  onNavigate: (screen: AppScreen) => void;
  systemMessage?: string;
};

const quickActions: Array<{ label: string; screen: AppScreen; tone?: 'primary' | 'dark' | 'success' }> = [
  { label: 'SATIŞ', screen: 'salesCustomer', tone: 'primary' },
  { label: 'Toplama', screen: 'picking', tone: 'dark' },
  { label: 'Açık Fiş', screen: 'openDocuments' },
  { label: 'QR', screen: 'qrAlbum' },
];

const modules: Array<{ label: string; description: string; screen: AppScreen; code: string }> = [
  { label: 'Depo Toplama', description: 'Barkodla tikle', screen: 'picking', code: 'TOP' },
  { label: 'Satış Taslakları', description: 'Yarım kalan fişler', screen: 'openSaleDrafts', code: 'TAS' },
  { label: 'Açık Fişler', description: 'Bekleyen fişler', screen: 'openDocuments', code: 'AÇK' },
  { label: 'QR Albüm', description: 'Ürün görselleri', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', description: 'Operasyon notları', screen: 'messages', code: 'MSG' },
  { label: 'Yazdırma Kuyruğu', description: 'Fiş tekrar yazdırma', screen: 'printQueue', code: 'PRN' },
  { label: 'Yazdırma Geçmişi', description: 'Fiş olay defteri', screen: 'printEventHistory', code: 'PGÇ' },
  { label: 'Günlük Yazdırma Özeti', description: 'Bugünkü print durumu', screen: 'printDailySummary', code: 'GÜN' },
  { label: 'Offline Kuyruk', description: 'Sync hazırlığı', screen: 'offlineQueue', code: 'SYN' },
  { label: 'Gönderilemeyenler', description: 'Kuyruk işlemleri', screen: 'failedQueue', code: 'ERR' },
  { label: 'İşlem Geçmişi', description: 'Terminal audit log', screen: 'auditLog', code: 'LOG' },
  { label: 'Kur Ayarları', description: 'Para birimi oranları', screen: 'currencySettings', code: 'KUR' },
  { label: 'Terminal Ayarları', description: 'Cihaz varsayılanları', screen: 'terminalSettings', code: 'CIH' },
  { label: 'Ayarlar', description: 'Terminal bilgileri', screen: 'settings', code: 'SET' },
];

type MainStatusSnapshot = {
  bridgeConnected: boolean | null;
  openSaleDraftCount: number;
  pendingPrintCount: number;
  printErrorCount: number;
  pendingOfflineCount: number;
  todayPrintErrorCount: number;
};

const emptyStatusSnapshot: MainStatusSnapshot = {
  bridgeConnected: null,
  openSaleDraftCount: 0,
  pendingPrintCount: 0,
  printErrorCount: 0,
  pendingOfflineCount: 0,
  todayPrintErrorCount: 0,
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export function DashboardScreen({ session, currentUser, onNavigate, systemMessage }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [activeDraft, setActiveDraft] = useState<ActiveSaleDraft | null>(null);
  const [mainStatus, setMainStatus] = useState<MainStatusSnapshot>(emptyStatusSnapshot);

  useEffect(() => {
    getMessagesMock().then((messages) => {
      setUnreadCount(messages.filter((message) => !message.read).length);
      setUrgentCount(messages.filter((message) => message.type === 'Acil' && !message.read).length);
    });
    getOpenDocumentsMock().then(setDocuments);
    loadFailedOperationsSnapshot().then(async (savedOperations) => {
      if (savedOperations) {
        setFailedCount(savedOperations.length);
        return;
      }
      const operations = await getFailedOperationsMock();
      await saveFailedOperations(operations);
      setFailedCount(operations.length);
    });
    Promise.all([
      loadActiveSaleDraft(),
      checkPrintBridgeHealth(),
      loadSaleDrafts(),
      loadSalePrintJobs(),
      loadOfflineActions(),
      loadPrintEvents(),
    ]).then(([activeSaleDraft, bridgeHealth, saleDrafts, printJobs, offlineActions, printEvents]) => {
      const openDraftNos = new Set(saleDrafts.filter((draft) => draft.draftStatus !== 'printPending').map((draft) => draft.documentNo));
      if (activeSaleDraft?.documentNo) openDraftNos.add(activeSaleDraft.documentNo);
      setActiveDraft(activeSaleDraft);
      setMainStatus({
        bridgeConnected: bridgeHealth.ok,
        openSaleDraftCount: openDraftNos.size,
        pendingPrintCount: printJobs.filter((job) => job.status === 'Yazdırma bekliyor').length,
        printErrorCount: printJobs.filter((job) => job.status === 'Yazdırma hatası').length,
        pendingOfflineCount: offlineActions.filter((action) => action.status === 'pending').length,
        todayPrintErrorCount: printEvents.filter((event) => isToday(event.createdAt) && (event.eventType === 'printError' || event.eventType === 'retryError')).length,
      });
    });
  }, []);

  const personName = session?.username || 'Personel';
  const activeLineCount = activeDraft?.lines.length ?? 0;
  const activeTotalQuantity = activeDraft?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const visibleQuickActions = quickActions.filter((action) => canOpenScreen(currentUser, action.screen));
  const visibleModules = modules.filter((module) => canOpenScreen(currentUser, module.screen));
  const isAdmin = currentUser?.role === 'admin';
  const hasMainIssue = mainStatus.bridgeConnected === false
    || mainStatus.openSaleDraftCount > 0
    || mainStatus.pendingPrintCount > 0
    || mainStatus.printErrorCount > 0
    || mainStatus.pendingOfflineCount > 0
    || mainStatus.todayPrintErrorCount > 0;

  return (
    <View style={styles.container}>
      <TerminalHeader terminalId={session?.terminalId ?? 'T01'} branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 56 }]}>
        <ToastMessage message={systemMessage} tone="info" />

        <View style={styles.industrialHeader}>
          <View>
            <Text style={styles.kicker}>INDUSTRIAL FAST MODE</Text>
            <Text style={styles.title}>Merhaba, {personName}</Text>
            {currentUser ? <Text style={styles.userLine}>{currentUser.code} · {currentUser.role.toUpperCase()}</Text> : null}
          </View>
          <StatusPill label="Hazır" tone="success" />
        </View>

        <View style={styles.quickBar}>
          {visibleQuickActions.map((action) => (
            <Pressable key={action.label} onPress={() => onNavigate(action.screen)} style={({ pressed }) => [styles.quickButton, action.tone === 'primary' && styles.quickPrimary, action.tone === 'dark' && styles.quickDark, pressed && styles.pressed]}>
              <Text style={[styles.quickText, (action.tone === 'primary' || action.tone === 'dark') && styles.quickTextLight]}>{action.label}</Text>
              {action.screen === 'messages' && unreadCount > 0 ? <View style={styles.quickUnreadDot}><Text style={styles.quickUnreadText}>{unreadCount}</Text></View> : null}
            </Pressable>
          ))}
        </View>

        <View style={[styles.todayStatusPanel, hasMainIssue ? styles.todayStatusWarning : styles.todayStatusSuccess]}>
          <View style={styles.todayStatusTop}>
            <View style={styles.todayStatusTextBlock}>
              <Text style={styles.todayStatusKicker}>BUGÜNKÜ DURUM</Text>
              <Text style={[styles.todayStatusTitle, hasMainIssue ? styles.todayStatusTitleWarning : styles.todayStatusTitleSuccess]}>
                {hasMainIssue ? 'Dikkat: Bekleyen veya hatalı işlem var.' : 'Bugün sistemde sorun görünmüyor.'}
              </Text>
            </View>
            <StatusPill label={mainStatus.bridgeConnected === null ? 'Kontrol' : mainStatus.bridgeConnected ? 'Bağlı' : 'Bağlı değil'} tone={mainStatus.bridgeConnected === null ? 'warning' : mainStatus.bridgeConnected ? 'success' : 'danger'} />
          </View>
          <View style={styles.todayStatusSimpleRow}>
            <StatusBox label="Açık satış" value={mainStatus.openSaleDraftCount.toString()} tone={mainStatus.openSaleDraftCount > 0 ? 'warning' : 'success'} />
            <StatusBox label="Bekleyen print" value={mainStatus.pendingPrintCount.toString()} tone={mainStatus.pendingPrintCount > 0 ? 'warning' : 'success'} />
            <StatusBox label="Hata" value={(mainStatus.printErrorCount + mainStatus.todayPrintErrorCount).toString()} tone={(mainStatus.printErrorCount + mainStatus.todayPrintErrorCount) > 0 ? 'danger' : 'success'} />
          </View>
          {isAdmin ? (
            <View style={styles.todayStatusAdminGrid}>
              <StatusBox label="Offline bekleyen" value={mainStatus.pendingOfflineCount.toString()} tone={mainStatus.pendingOfflineCount > 0 ? 'warning' : 'success'} />
              <StatusBox label="Print hata" value={mainStatus.printErrorCount.toString()} tone={mainStatus.printErrorCount > 0 ? 'danger' : 'success'} />
              <StatusBox label="Bugünkü hata" value={mainStatus.todayPrintErrorCount.toString()} tone={mainStatus.todayPrintErrorCount > 0 ? 'danger' : 'success'} />
            </View>
          ) : null}
        </View>

        {urgentCount > 0 ? (
          <Pressable onPress={() => onNavigate('messages')} style={({ pressed }) => [styles.urgentAlert, pressed && styles.pressed]}>
            <Text style={styles.urgentAlertText}>Acil mesaj var</Text>
            <Text style={styles.urgentAlertCount}>{urgentCount}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => onNavigate('picking')} style={({ pressed }) => [styles.pickingHero, pressed && styles.pressed]}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroKicker}>DEPO TOPLAMA</Text>
            <Text style={styles.heroTitle}>Barkodla tikle</Text>
            <Text style={styles.heroText}>Fişi aç, ürünü okut, doğruysa otomatik toplandı yap.</Text>
          </View>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>TOPLA</Text></View>
        </Pressable>

        <View style={styles.summaryGrid}>
          <SummaryBox label="Açık" value={documents.length.toString()} />
          <SummaryBox label="Aktif" value={activeLineCount > 0 ? activeLineCount.toString() : '0'} />
          <SummaryBox label="Adet" value={activeTotalQuantity.toString()} />
          <SummaryBox label="Risk" value={failedCount.toString()} tone={failedCount > 0 ? 'warning' : 'dark'} />
        </View>

        <View style={styles.menuGrid}>
          {visibleModules.map((module) => (
            <Pressable key={module.screen} onPress={() => onNavigate(module.screen)} style={({ pressed }) => [styles.module, module.screen === 'picking' && styles.moduleFeatured, pressed && styles.pressed]}>
              <View style={styles.codeBox}><Text style={styles.codeText}>{module.code}</Text></View>
              <View style={styles.moduleTextBlock}>
                <Text style={styles.moduleText}>{module.label}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              {module.screen === 'messages' && unreadCount > 0 ? <View style={styles.moduleUnreadBadge}><Text style={styles.moduleUnreadText}>{unreadCount}</Text></View> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>Hedef: okut → doğrula → ekle/topla</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: string;
  tone?: 'dark' | 'danger' | 'warning';
};

type StatusBoxProps = {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger';
};

function StatusBox({ label, value, tone = 'success' }: StatusBoxProps) {
  return (
    <View style={styles.statusBox}>
      <Text style={[styles.statusBoxValue, tone === 'success' && styles.statusBoxSuccess, tone === 'warning' && styles.statusBoxWarning, tone === 'danger' && styles.statusBoxDanger]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statusBoxLabel}>{label}</Text>
    </View>
  );
}

function SummaryBox({ label, value, tone = 'dark' }: SummaryBoxProps) {
  return (
    <View style={styles.summaryBox}>
      <Text style={[styles.summaryValue, tone === 'danger' && styles.summaryDanger, tone === 'warning' && styles.summaryWarning]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { padding: spacing.sm, gap: spacing.xs },
  industrialHeader: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.lg,
    borderBottomWidth: 3,
    borderBottomColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kicker: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  title: { color: colors.surface, fontSize: typography.section, fontWeight: '900' },
  userLine: { color: colors.line, fontSize: typography.small, fontWeight: '900', marginTop: 2 },
  quickBar: { flexDirection: 'row', gap: spacing.xs },
  quickButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.anthracite,
    ...shadows.subtle,
  },
  quickPrimary: { backgroundColor: colors.red, borderColor: colors.redDark, borderBottomColor: colors.anthracite },
  quickDark: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderBottomColor: colors.red },
  quickText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  quickTextLight: { color: colors.surface },
  quickUnreadDot: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickUnreadText: { color: colors.surface, fontSize: 10, fontWeight: '900' },
  todayStatusPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  todayStatusSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  todayStatusWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  todayStatusTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  todayStatusTextBlock: { flex: 1, gap: 2 },
  todayStatusKicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  todayStatusTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  todayStatusTitleSuccess: { color: colors.success },
  todayStatusTitleWarning: { color: colors.amber },
  todayStatusSimpleRow: { flexDirection: 'row', gap: spacing.xs },
  todayStatusAdminGrid: { flexDirection: 'row', gap: spacing.xs },
  statusBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  statusBoxValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  statusBoxSuccess: { color: colors.success },
  statusBoxWarning: { color: colors.amber },
  statusBoxDanger: { color: colors.red },
  statusBoxLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  urgentAlert: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentAlertText: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  urgentAlertCount: {
    minWidth: 24,
    textAlign: 'center',
    color: colors.surface,
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    overflow: 'hidden',
    fontSize: typography.small,
    fontWeight: '900',
    paddingVertical: 2,
  },
  pickingHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.anthracite,
    borderLeftWidth: 5,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...shadows.subtle,
  },
  heroTextBlock: { flex: 1, gap: 2 },
  heroKicker: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  heroTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  heroText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  heroBadge: { backgroundColor: colors.red, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minHeight: 34, justifyContent: 'center' },
  heroBadgeText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summaryBox: {
    flex: 1,
    minWidth: '23%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: 3,
    borderTopWidth: 2,
    borderTopColor: colors.anthracite,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    ...shadows.subtle,
  },
  summaryValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  summaryDanger: { color: colors.red },
  summaryWarning: { color: colors.amber },
  summaryLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', marginTop: 2 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  module: {
    width: '48.7%',
    minHeight: 62,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.subtle,
  },
  moduleFeatured: { borderColor: colors.red, borderLeftWidth: 4, borderLeftColor: colors.red },
  codeBox: { width: 36, height: 28, borderRadius: radius.sm, backgroundColor: colors.anthracite, alignItems: 'center', justifyContent: 'center' },
  codeText: { color: colors.surface, fontWeight: '900', fontSize: typography.small },
  moduleTextBlock: { flex: 1, gap: 2 },
  moduleText: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  moduleDescription: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  moduleUnreadBadge: { minWidth: 22, height: 22, borderRadius: radius.sm, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.redDark },
  moduleUnreadText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  footerNote: { backgroundColor: colors.anthracite, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.red },
  footerNoteText: { color: colors.surface, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  pressed: { opacity: 0.86 },
});
