import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { testConnectionMock } from '../../services/api';
import { loadSettings, saveSettings } from '../../storage/localStorage';
import type { TerminalSettings, UserSession } from '../../types';
import { colors } from '../theme';

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
    <ScreenShell title="Ayarlar" subtitle="Terminal ve mock API ayarları" onBack={onBack}>
      <Text style={styles.label}>Terminal ID</Text>
      <TextInput value={settings.terminalId} onChangeText={(value) => update('terminalId', value)} style={styles.input} />
      <Text style={styles.label}>Depo</Text>
      <TextInput value={settings.branch} onChangeText={(value) => update('branch', value)} style={styles.input} />
      <Text style={styles.label}>API adresi</Text>
      <TextInput value={settings.apiBaseUrl} onChangeText={(value) => update('apiBaseUrl', value)} style={styles.input} />
      <AppButton label="Ayarları Kaydet" onPress={save} />
      <AppButton label="Bağlantı Testi" onPress={test} variant="secondary" />
      <AppButton label="Veri Güncelle" onPress={() => setStatus('Mock veri güncelleme kontrolü hazır.')} variant="dark" />
      <InfoCard title="Durum" subtitle={status} />
      <InfoCard title="Güvenli sınır" subtitle="Bu ekran gerçek API, Vega veya SQL bağlantısı başlatmaz." tone="warning" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.black, fontSize: 16, fontWeight: '900' },
  input: { minHeight: 58, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, color: colors.black, fontSize: 18, paddingHorizontal: 14, fontWeight: '700' },
});
