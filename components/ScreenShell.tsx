import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../app/theme';
import { AppButton } from './AppButton';
import { TerminalHeader } from './TerminalHeader';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
};

export function ScreenShell({ title, subtitle, onBack, children }: ScreenShellProps) {
  return (
    <View style={styles.shell}>
      <TerminalHeader onBack={onBack} />
      <View style={styles.header}>
        <Text style={styles.kicker}>OPERASYON EKRANI</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {onBack ? (
        <View style={styles.footer}>
          <AppButton label="Ana Menüye Dön" onPress={onBack} variant="dark" compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  kicker: {
    color: colors.red,
    fontSize: typography.small,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: 3,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
