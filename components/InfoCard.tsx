import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../app/theme';

type InfoCardProps = {
  title: string;
  subtitle?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning' | 'dark';
  children?: ReactNode;
};

export function InfoCard({ title, subtitle, tone = 'default', children }: InfoCardProps) {
  return (
    <View style={[styles.card, styles[tone]]}>
      <Text style={[styles.title, tone === 'dark' && styles.darkTitle]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, tone === 'dark' && styles.darkSubtitle]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  default: {
    borderLeftWidth: 4,
    borderLeftColor: colors.anthracite,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  dark: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
  },
  title: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  darkTitle: {
    color: colors.surface,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 20,
    fontWeight: '600',
  },
  darkSubtitle: {
    color: colors.line,
  },
});
