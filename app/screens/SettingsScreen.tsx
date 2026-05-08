import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { testConnectionMock } from '../../services/api';
import { loadSettings, saveSettings } from '../../storage/localStorage';
import type { TerminalSettings, UserSession } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type SettingsScreenProps = {
  onBack: () => void;
  session: UserSession | null;
};

export function SettingsScreen({ onBack, session }: SettingsScreenProps) {
  const [settings, setSettings] = useState<TerminalSettings>({
    terminalId: 'MB-TERM-001',
    branch: session?.branch ?? 'Merkez Depo',
    apiBaseUrl: 'Mock API',
  });
  const [status, setStatus] = useState('Ayarlar local storage içinde saklanır.');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (key: keyof TerminalSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    await saveSettings(settings);
    setStatus('Ayarlar kaydedildi.');
  };

  const test = async () => {
    const result = await testConnectionMock(settings);
    setStatus(result.message);
  };

  return (
    <ScreenShell title="Terminal Ayarları" subtitle="Cihaz, depo ve mock bağlantı bilgileri" onBack={onBack}>
      <View style={styles.formPanel}>
        <Field label="Terminal ID" value={settings.terminalId} onChangeText={(value) => update('terminalId', value)} />
        <Field label="Depo" value={settings.branch} onChangeText={(value) => update('branch', value)} />
        <Field label="API adresi" value={settings.apiBaseUrl} onChangeText={(value) => update('apiBaseUrl', value)} />
      </View>
      <View style={styles.actions}>
        <AppButton label="Ayarları Kaydet" onPress={save} />
        <AppButton label="Bağlantı Testi" onPress={test} variant="secondary" />
        <AppButton label="Veri Güncelle" onPress={() => setStatus('Mock veri güncelleme kontrolü hazır.')} variant="dark" />
      </View>
      <InfoCard title="Durum" subtitle={status} />
      <InfoCard title="Güvenli sınır" subtitle="Bu ekran gerçek API, Vega veya SQL bağlantısı başlatmaz." tone="warning" />
    </ScreenShell>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function Field({ label, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  formPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.anthracite,
    fontSize: typography.body,
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
  },
});
