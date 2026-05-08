import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { loginMock } from '../../services/api';
import type { UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

const branches = ['Merkez Depo', 'Mağaza', 'Sevkiyat'];

type LoginScreenProps = {
  onLogin: (session: UserSession) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [branch, setBranch] = useState(branches[0]);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const submit = async (offlineMode: boolean) => {
    if (!pin.trim()) {
      setBanner({ message: 'PIN boş bırakılamaz. Devam etmek için terminal PIN bilgisini gir.', tone: 'warning' });
      return;
    }

    setBanner({ message: offlineMode ? 'Çevrimdışı terminal oturumu hazırlanıyor.' : 'Giriş başarılı, ana menü açılıyor.', tone: 'success' });
    const session = await loginMock(username || 'Personel', branch, offlineMode);
    onLogin(session);
  };

  return (
    <View style={styles.container}>
      <View style={styles.terminalCap}>
        <Text style={styles.brand}>MELİSA BEBE</Text>
        <Text style={styles.capMeta}>T01 · Android Terminal · v0.2.0</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>El Terminali Giriş</Text>
        <Text style={styles.subtitle}>Kullanıcı adı boşsa Personel olarak devam eder.</Text>
        <ToastMessage message={banner?.message} tone={banner?.tone} />

        <View style={styles.field}>
          <Text style={styles.label}>Kullanıcı adı</Text>
          <TextInput value={username} onChangeText={setUsername} placeholder="Personel adı" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN</Text>
          <TextInput value={pin} onChangeText={setPin} placeholder="4 haneli PIN" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry keyboardType="number-pad" />
        </View>

        <Text style={styles.label}>Şube / depo</Text>
        <View style={styles.branchGrid}>
          {branches.map((item) => (
            <AppButton key={item} label={item} onPress={() => setBranch(item)} variant={branch === item ? 'primary' : 'quiet'} compact />
          ))}
        </View>

        <View style={styles.actions}>
          <AppButton label="Giriş Yap" onPress={() => submit(false)} />
          <AppButton label="Çevrimdışı Devam Et" onPress={() => submit(true)} variant="secondary" />
        </View>
      </View>

      <Text style={styles.footer}>Mock data · Local storage · Gerçek Vega / SQL yazma yok</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  terminalCap: {
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.xl,
    paddingTop: 28,
    paddingBottom: spacing.lg,
    borderBottomWidth: 4,
    borderBottomColor: colors.red,
  },
  brand: { color: colors.surface, fontSize: typography.brand, fontWeight: '900' },
  capMeta: { color: colors.line, fontSize: typography.small, fontWeight: '800', marginTop: spacing.xs },
  panel: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
    ...shadows.subtle,
  },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: typography.body, fontWeight: '700', marginTop: -spacing.sm },
  field: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.section,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
  },
  branchGrid: { gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  footer: { color: colors.muted, fontSize: typography.small, fontWeight: '700', textAlign: 'center', paddingHorizontal: spacing.lg },
});
