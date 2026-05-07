import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../app/theme';
import { AppButton } from './AppButton';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
};

export function ScreenShell({ title, subtitle, onBack, children }: ScreenShellProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.brand}>MELİSA BEBE</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {onBack ? (
        <View style={styles.footer}>
          <AppButton label="Ana Menüye Dön" onPress={onBack} variant="dark" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.softWhite },
  header: { backgroundColor: colors.red, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, gap: 4 },
  brand: { color: colors.white, fontSize: 15, fontWeight: '900' },
  title: { color: colors.white, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  content: { padding: 14, gap: 12 },
  footer: { padding: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.lightGray },
});
