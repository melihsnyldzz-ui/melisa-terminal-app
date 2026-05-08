import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'quiet';
  badge?: number;
  compact?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', badge, compact = false }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[variant], compact && styles.compact, pressed && styles.pressed]}
    >
      <Text style={[styles.label, (variant === 'secondary' || variant === 'quiet') && styles.darkLabel]}>{label}</Text>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compact: {
    minHeight: 46,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.red,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dark: {
    backgroundColor: colors.anthracite,
  },
  quiet: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '800',
    textAlign: 'center',
  },
  darkLabel: {
    color: colors.ink,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
});
