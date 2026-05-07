import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../app/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost';
  badge?: number;
};

export function AppButton({ label, onPress, variant = 'primary', badge }: AppButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed]}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
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
    minHeight: 62,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primary: { backgroundColor: colors.red },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray },
  dark: { backgroundColor: colors.black },
  ghost: { backgroundColor: colors.softWhite, borderWidth: 1, borderColor: colors.lightGray },
  pressed: { opacity: 0.78 },
  label: { color: colors.white, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  secondaryLabel: { color: colors.black },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: { color: colors.white, fontWeight: '900' },
});
