import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
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
  const [lastSync, setLastSync] = useState('Bugün 09:40');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (key: keyof TerminalSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    await saveSettings(settings);
    setBanner({ message: 'Terminal ayarları local storage içine kaydedildi.', tone: 'success' });
  };

  const test = async () => {
    const result = await testConnectionMock(settings);
    setBanner({ message: result.message, tone: result.ok ? 'success' : 'error' });
  };

  const updateData = () => {
    const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setLastSync(`Bugün ${nextSync}`);
    setBanner({ message: 'Mock veri güncelleme tamamlandı. Bekleyen belgeler korunur.', tone: 'success' });
  };

  return (
    <ScreenShell title="Terminal Ayarları" subtitle="Cihaz, bağlantı ve güvenlik kontrolleri" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <Section title="Terminal Bilgisi">
        <Field label="Terminal ID" value={settings.terminalId} onChangeText={(value) => update('terminalId', value)} />
        <Field label="Depo" value={settings.branch} onChangeText={(value) => update('branch', value)} />
        <AppButton label="Ayarları Kaydet" onPress={save} compact />
      </Section>

      <Section title="Bağlantı">
        <Field label="API adresi" value={settings.apiBaseUrl} onChangeText={(value) => update('apiBaseUrl', value)} />
        <AppButton label="Bağlantı Testi" onPress={test} variant="secondary" compact />
      </Section>

      <Section title="Senkron">
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Son senkron</Text>
          <StatusPill label={lastSync} tone="dark" />
        </View>
        <AppButton label="Veri Güncelle" onPress={updateData} variant="dark" compact />
      </Section>

      <Section title="Güvenlik">
        <InfoCard title="Güvenli sınır" subtitle="Bu ekran gerçek API, Vega veya SQL bağlantısı başlatmaz." tone="warning" />
        <AppButton label="Oturumu Kapat" onPress={() => setBanner({ message: 'Oturumu kapatma mock olarak gösterildi.', tone: 'info' })} variant="secondary" compact />
      </Section>
    </ScreenShell>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  field: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
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
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
});
