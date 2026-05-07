import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../app/theme';

type InfoCardProps = {
  title: string;
  subtitle?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  children?: ReactNode;
};

export function InfoCard({ title, subtitle, tone = 'default', children }: InfoCardProps) {
  return (
    <View style={[styles.card, styles[tone]]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lightGray,
    gap: 8,
  },
  default: { borderLeftWidth: 5, borderLeftColor: colors.black },
  danger: { borderLeftWidth: 5, borderLeftColor: colors.red },
  success: { borderLeftWidth: 5, borderLeftColor: colors.green },
  warning: { borderLeftWidth: 5, borderLeftColor: colors.amber },
  title: { color: colors.black, fontSize: 17, fontWeight: '900' },
  subtitle: { color: colors.gray, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
