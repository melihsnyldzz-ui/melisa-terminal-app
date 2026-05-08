import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'dark';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.amber },
  danger: { backgroundColor: colors.dangerSoft, color: colors.red },
  info: { backgroundColor: colors.surfaceSoft, color: colors.anthracite },
  dark: { backgroundColor: colors.anthracite, color: colors.surface },
};

export function StatusPill({ label, tone = 'info' }: StatusPillProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={[styles.text, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

export function statusToneFor(label: string): StatusTone {
  if (['Açık', 'Online', 'Hazır', 'Okundu', 'Başarılı'].includes(label)) return 'success';
  if (['Beklemede', 'Taslak', 'Uyarı'].includes(label)) return 'warning';
  if (['Gönderilemedi', 'Acil', 'Okunmadı', 'Offline', 'Hata'].includes(label)) return 'danger';
  return 'info';
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: {
    fontSize: typography.small,
    fontWeight: '900',
  },
});
