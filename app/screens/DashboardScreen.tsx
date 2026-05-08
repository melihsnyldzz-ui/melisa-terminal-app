import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { TerminalStatusBar } from '../../components/TerminalStatusBar';
import { getMessagesMock } from '../../services/api';
import type { AppScreen, UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
};

const modules: Array<{ label: string; screen: AppScreen; code: string; primary?: boolean }> = [
  { label: 'Yeni Fiş / Satış', screen: 'newSale', code: 'FİŞ', primary: true },
  { label: 'Açık Fişler', screen: 'openDocuments', code: 'AÇK' },
  { label: 'QR Albüm', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', screen: 'messages', code: 'MSG' },
  { label: 'Gönderilemeyenler', screen: 'failedQueue', code: 'ERR' },
  { label: 'Veri Güncelle', screen: 'dataUpdate', code: 'SYN' },
  { label: 'Ayarlar', screen: 'settings', code: 'SET' },
];

export function DashboardScreen({ session, onNavigate }: DashboardScreenProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getMessagesMock().then((messages) => setUnreadCount(messages.filter((message) => !message.read).length));
  }, []);

  return (
    <View style={styles.container}>
      <TerminalStatusBar terminalId="T01" branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>ANA OPERASYON</Text>
          <Text style={styles.title}>Terminal Ana Ekranı</Text>
          <Text style={styles.subtitle}>{session?.username ?? 'Personel'} için hızlı saha menüsü</Text>
        </View>

        <View style={styles.menuGrid}>
          {modules.map((module) => (
            <Pressable key={module.screen} onPress={() => onNavigate(module.screen)} style={({ pressed }) => [styles.module, module.primary && styles.primaryModule, pressed && styles.pressed]}>
              <View style={[styles.codeBox, module.primary && styles.primaryCodeBox]}>
                <Text style={[styles.codeText, module.primary && styles.primaryCodeText]}>{module.code}</Text>
              </View>
              <Text style={[styles.moduleText, module.primary && styles.primaryModuleText]}>{module.label}</Text>
              {module.screen === 'messages' && unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <InfoCard title="Güvenli v0.1.2 mod" subtitle="Mock data ve local storage kullanılır. Gerçek Vega / SQL yazma işlemi yoktur." tone="dark" />
      </ScrollView>
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
    gap: spacing.lg,
  },
  heading: {
    gap: 2,
  },
  kicker: {
    color: colors.red,
    fontSize: typography.small,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
  },
  menuGrid: {
    gap: spacing.sm,
  },
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
  primaryModule: {
    backgroundColor: colors.red,
    borderColor: colors.redDark,
  },
  pressed: {
    opacity: 0.82,
  },
  codeBox: {
    width: 44,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCodeBox: {
    backgroundColor: colors.surface,
  },
  codeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  primaryCodeText: {
    color: colors.red,
  },
  moduleText: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  primaryModuleText: {
    color: colors.surface,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.surface,
    fontWeight: '900',
  },
});
