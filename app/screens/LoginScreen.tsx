import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const pinInputRef = useRef<TextInput>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [branch, setBranch] = useState(branches[0]);
  const [pinHighlighted, setPinHighlighted] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const requestPin = () => {
    setPinHighlighted(true);
    setBanner({ message: 'Devam etmek için terminal PIN bilgisini gir.', tone: 'warning' });
    pinInputRef.current?.focus();
  };

  const submit = async (offlineMode: boolean) => {
    if (!pin.trim()) {
      requestPin();
      return;
    }

    setBanner({ message: offlineMode ? 'Çevrimdışı kullanım hazır.' : 'Giriş başarılı, ana menü açılıyor.', tone: 'success' });
    const session = await loginMock(username || 'Personel', branch, offlineMode);
    onLogin(session);
  };

  const handleTerminalPress = () => {
    if (pin.trim()) {
      void submit(false);
      return;
    }

    requestPin();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={handleTerminalPress} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
          <View style={styles.brandMark}>
            <Text style={styles.brandInitials}>MB</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>MELİSA BEBE</Text>
            <Text style={styles.product}>Saha Terminali</Text>
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={handleTerminalPress} style={({ pressed }) => [styles.terminalCard, pressed && styles.cardPressed]}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardKicker}>Terminale Giriş</Text>
              <Text style={styles.cardTitle}>T01 · {branch}</Text>
            </View>
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>HAZIR</Text>
            </View>
          </View>
          <Text style={styles.cardHint}>Devam etmek için dokun</Text>
        </Pressable>

        <ToastMessage message={banner?.message} tone={banner?.tone} />

        <View style={styles.panel}>
          <View style={styles.fieldSecondary}>
            <Text style={styles.secondaryLabel}>Kullanıcı adı</Text>
            <TextInput value={username} onChangeText={setUsername} placeholder="Personel" placeholderTextColor={colors.muted} style={styles.secondaryInput} autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              ref={pinInputRef}
              value={pin}
              onChangeText={(value) => {
                setPin(value);
                if (value.trim()) setPinHighlighted(false);
              }}
              placeholder="4 haneli PIN"
              placeholderTextColor={colors.muted}
              style={[styles.input, pinHighlighted && styles.inputWarning]}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Şube / depo</Text>
            <View style={styles.segmentGroup}>
              {branches.map((item) => {
                const selected = branch === item;
                return (
                  <Pressable key={item} accessibilityRole="button" onPress={() => setBranch(item)} style={[styles.segment, selected && styles.segmentSelected]}>
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton label="Giriş Yap" onPress={() => submit(false)} />
            <AppButton label="Çevrimdışı Devam Et" onPress={() => submit(true)} variant="secondary" />
          </View>
        </View>

        <Text style={styles.footer}>Terminal hazır · Veriler cihazda korunur</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderBottomWidth: 4,
    borderBottomColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.subtle,
  },
  pressed: {
    opacity: 0.9,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitials: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '900',
  },
  brandCopy: {
    flex: 1,
  },
  brand: {
    color: colors.surface,
    fontSize: typography.brand,
    fontWeight: '900',
  },
  product: {
    color: colors.line,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: 2,
  },
  terminalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 5,
    borderLeftColor: colors.red,
    gap: spacing.md,
    ...shadows.subtle,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardKicker: {
    color: colors.red,
    fontSize: typography.body,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  readyBadge: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  readyBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  cardHint: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '800',
  },
  panel: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
    ...shadows.subtle,
  },
  field: {
    gap: spacing.xs,
  },
  fieldSecondary: {
    gap: spacing.xs,
    opacity: 0.92,
  },
  label: {
    color: colors.anthracite,
    fontSize: typography.body,
    fontWeight: '900',
  },
  secondaryLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.anthracite,
    color: colors.ink,
    fontSize: 19,
    paddingHorizontal: spacing.md,
    fontWeight: '900',
  },
  inputWarning: {
    borderColor: colors.red,
    backgroundColor: colors.dangerSoft,
  },
  secondaryInput: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentSelected: {
    backgroundColor: colors.anthracite,
  },
  segmentText: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: colors.surface,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footer: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
