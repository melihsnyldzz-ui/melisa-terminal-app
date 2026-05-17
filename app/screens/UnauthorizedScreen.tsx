import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { colors, radius, spacing, typography } from '../theme';

type UnauthorizedScreenProps = {
  onBack: () => void;
};

export function UnauthorizedScreen({ onBack }: UnauthorizedScreenProps) {
  return (
    <ScreenShell title="Yetki Yok" subtitle="Bu işlem için yetkiniz yok" onBack={onBack}>
      <View style={styles.panel}>
        <Text style={styles.badge}>YETKİ</Text>
        <Text style={styles.title}>Bu işlem için yetkiniz yok</Text>
        <Text style={styles.text}>Seçili personel rolü bu ekrana erişemez. Gerekirse admin kullanıcısı ile tekrar seçin.</Text>
        <AppButton label="Ana Menüye Dön" onPress={onBack} variant="dark" compact />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.red,
    color: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: typography.small,
    fontWeight: '900',
  },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  text: { color: colors.text, fontSize: typography.body, fontWeight: '800', lineHeight: 18 },
});
