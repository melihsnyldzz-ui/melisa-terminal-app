import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../app/theme';
import { StatusPill } from './StatusPill';

type TerminalHeaderProps = {
  title?: string;
  terminalId?: string;
  branch?: string;
  online?: boolean;
  onBack?: () => void;
};

export function TerminalHeader({ title = 'MELİSA BEBE', terminalId = 'T01', branch = 'Merkez Depo', online = true, onBack }: TerminalHeaderProps) {
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>GERİ</Text>
          </Pressable>
        ) : null}
        <Text style={styles.brand}>{title}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Terminal ID: {terminalId}</Text>
        <Text style={styles.meta}>Depo: {branch}</Text>
        <StatusPill label={online ? 'Online' : 'Offline'} tone={online ? 'success' : 'danger'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.red,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 4,
  },
  backText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  brand: {
    flex: 1,
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
  },
  time: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meta: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
  },
});
