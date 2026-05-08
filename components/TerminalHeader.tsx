import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';
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
          <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>GERİ</Text>
          </Pressable>
        ) : null}
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>{title}</Text>
          <Text style={styles.subBrand}>Saha Terminali</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>{terminalId}</Text>
        </View>
        <Text style={styles.meta}>{branch}</Text>
        <StatusPill label={online ? 'Hazır' : 'Çevrimdışı'} tone={online ? 'success' : 'warning'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  backText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  brandBlock: {
    flex: 1,
  },
  brand: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
  },
  subBrand: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
    marginTop: 1,
  },
  time: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaLabel: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '900',
  },
  meta: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
  },
});
