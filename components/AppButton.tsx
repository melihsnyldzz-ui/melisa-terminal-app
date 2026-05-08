import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../app/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'quiet';
  badge?: number;
  compact?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', badge, compact = false }: AppButtonProps) {
  const isLight = variant === 'secondary' || variant === 'quiet';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[variant], compact && styles.compact, pressed && styles.pressed]}
    >
      <Text style={[styles.label, isLight && styles.darkLabel]}>{label}</Text>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={[styles.badge, variant === 'dark' && styles.lightBadge]}>
          <Text style={[styles.badgeText, variant === 'dark' && styles.darkBadgeText]}>{badge}</Text>
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
    borderWidth: 1,
    ...shadows.subtle,
  },
  compact: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.red,
    borderColor: colors.redDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.anthracite,
  },
  dark: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
  },
  quiet: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  label: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
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
  lightBadge: {
    backgroundColor: colors.surface,
  },
  badgeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  darkBadgeText: {
    color: colors.anthracite,
  },
});
