import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { loadPersonnelUsers, loadTerminalDeviceSettings } from '../../storage/localStorage';
import type { PersonnelUser } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { APP_DISPLAY_VERSION } from '../version';

type PersonnelSelectScreenProps = {
  onSelect: (user: PersonnelUser) => void;
  systemMessage?: string;
};

export function PersonnelSelectScreen({ onSelect, systemMessage }: PersonnelSelectScreenProps) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<PersonnelUser[]>([]);
  const [defaultPersonnelCode, setDefaultPersonnelCode] = useState('');

  useEffect(() => {
    Promise.all([loadPersonnelUsers(), loadTerminalDeviceSettings()]).then(([items, terminalSettings]) => {
      const defaultCode = terminalSettings.defaultPersonnelCode.toUpperCase();
      setDefaultPersonnelCode(defaultCode);
      setUsers(items
        .filter((user) => user.isActive)
        .sort((first, second) => Number(second.code.toUpperCase() === defaultCode) - Number(first.code.toUpperCase() === defaultCode)));
    });
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 56 }]}>
        <View style={styles.hero}>
          <View style={styles.brandMark}><Text style={styles.brandInitials}>MB</Text></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>MELİSA BEBE</Text>
            <Text style={styles.product}>Personel seçimi</Text>
          </View>
          <View style={styles.versionBadge}><Text style={styles.versionText}>{APP_DISPLAY_VERSION}</Text></View>
        </View>

        <ToastMessage message={systemMessage} tone="info" />

        <View style={styles.panel}>
          <Text style={styles.title}>Terminal kullanıcısı</Text>
          <Text style={styles.text}>İşlemler, açık fişler ve audit log seçilen personel adına kaydedilir.</Text>
          {users.map((user) => {
            const isDefault = user.code.toUpperCase() === defaultPersonnelCode;
            return (
              <Pressable key={user.id} onPress={() => onSelect(user)} style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}>
                <View style={styles.userMain}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userMeta}>{user.code} · {user.role.toUpperCase()}</Text>
                </View>
                <View style={styles.userSide}>
                  {isDefault ? <StatusPill label="Varsayılan" tone="warning" /> : null}
                  <StatusPill label="Seç" tone="success" />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.sm, gap: spacing.sm, justifyContent: 'center' },
  hero: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.subtle,
  },
  brandMark: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  brandInitials: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  brandCopy: { flex: 1 },
  brand: { color: colors.surface, fontSize: typography.title, fontWeight: '900' },
  product: { color: colors.line, fontSize: typography.body, fontWeight: '800', marginTop: 2 },
  versionBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.anthraciteSoft,
    backgroundColor: '#161b22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  versionText: { color: colors.line, fontSize: typography.small, fontWeight: '900' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  text: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  userRow: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  userMain: { flex: 1, gap: 2 },
  userSide: { alignItems: 'flex-end', gap: spacing.xs },
  userName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  userMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
