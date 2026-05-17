import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addAuditLog, loadSettings, loadTerminalDeviceSettings, saveSettings, saveTerminalDeviceSettings } from '../../storage/localStorage';
import type { CurrencyCode, TerminalDeviceSettings } from '../../types';
import { normalizeCurrencyCode } from '../utils/currencyUtils';
import { colors, radius, spacing, typography } from '../theme';

type TerminalSettingsScreenProps = {
  onBack: () => void;
};

const currencyOptions: CurrencyCode[] = ['TRY', 'USD', 'EUR'];

const toInputState = (settings: TerminalDeviceSettings) => ({
  deviceName: settings.deviceName,
  branchName: settings.branchName,
  warehouseName: settings.warehouseName,
  defaultPersonnelCode: settings.defaultPersonnelCode,
  defaultSaleCurrency: settings.defaultSaleCurrency,
  apiBaseUrl: settings.apiBaseUrl,
});

const changedFields = (previous: TerminalDeviceSettings, next: TerminalDeviceSettings) => {
  const fields: Array<{ key: keyof TerminalDeviceSettings; label: string }> = [
    { key: 'deviceName', label: 'Cihaz adı' },
    { key: 'branchName', label: 'Şube' },
    { key: 'warehouseName', label: 'Depo' },
    { key: 'defaultPersonnelCode', label: 'Varsayılan personel' },
    { key: 'defaultSaleCurrency', label: 'Varsayılan para birimi' },
    { key: 'apiBaseUrl', label: 'API adresi' },
  ];

  return fields
    .filter((field) => previous[field.key] !== next[field.key])
    .map((field) => `${field.label}: ${previous[field.key] || '-'} -> ${next[field.key] || '-'}`);
};

export function TerminalSettingsScreen({ onBack }: TerminalSettingsScreenProps) {
  const [savedSettings, setSavedSettings] = useState<TerminalDeviceSettings | null>(null);
  const [values, setValues] = useState(() => toInputState({
    deviceId: 'HONEYWELL-01',
    deviceName: 'HONEYWELL-01',
    branchName: 'MERKEZ',
    warehouseName: 'MERKEZ',
    defaultPersonnelCode: 'DEPO01',
    defaultSaleCurrency: 'TRY',
    apiBaseUrl: 'http://192.168.1.45:8787',
  }));
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadTerminalDeviceSettings().then((settings) => {
      setSavedSettings(settings);
      setValues(toInputState(settings));
    });
  }, []);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!values.deviceName.trim()) errors.push('Cihaz adı boş olamaz.');
    if (!values.branchName.trim()) errors.push('Şube boş olamaz.');
    if (!values.warehouseName.trim()) errors.push('Depo boş olamaz.');
    if (!values.defaultPersonnelCode.trim()) errors.push('Varsayılan personel kodu boş olamaz.');
    if (!values.apiBaseUrl.trim()) errors.push('API adresi boş olamaz.');
    if (values.apiBaseUrl.trim() && !/^https?:\/\/.+/i.test(values.apiBaseUrl.trim())) {
      errors.push('API adresi http:// veya https:// ile başlamalı.');
    }
    return errors;
  }, [values]);

  const updateValue = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!savedSettings) return;
    if (validation.length > 0) {
      setBanner({ message: validation[0], tone: 'error' });
      notifyWarning();
      return;
    }

    const nextSettings: TerminalDeviceSettings = {
      ...savedSettings,
      deviceName: values.deviceName.trim(),
      branchName: values.branchName.trim().toUpperCase(),
      warehouseName: values.warehouseName.trim().toUpperCase(),
      defaultPersonnelCode: values.defaultPersonnelCode.trim().toUpperCase(),
      defaultSaleCurrency: normalizeCurrencyCode(values.defaultSaleCurrency),
      apiBaseUrl: values.apiBaseUrl.trim(),
      updatedAt: new Date().toISOString(),
    };
    const changes = changedFields(savedSettings, nextSettings);

    await saveTerminalDeviceSettings(nextSettings);
    const legacySettings = await loadSettings();
    await saveSettings({
      ...legacySettings,
      terminalId: nextSettings.deviceName,
      branch: nextSettings.branchName,
      apiBaseUrl: nextSettings.apiBaseUrl,
    });
    await addAuditLog({
      operationType: 'Terminal ayarı değişti',
      description: changes.length > 0 ? changes.join(' · ') : 'Terminal ayarları tekrar kaydedildi.',
      status: 'success',
      deviceId: nextSettings.deviceId,
      deviceName: nextSettings.deviceName,
    });

    setSavedSettings(nextSettings);
    setBanner({ message: 'Terminal ayarları kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  return (
    <ScreenShell title="Terminal Ayarları" subtitle="Cihaz varsayılanları" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.summaryPanel}>
        <View style={styles.summaryTextBlock}>
          <Text style={styles.summaryTitle}>{savedSettings?.deviceId || 'HONEYWELL-01'}</Text>
          <Text style={styles.summaryText}>Cihaz adı, şube, depo, varsayılan personel ve yerel API adresi bu terminalde saklanır.</Text>
        </View>
        <StatusPill label={savedSettings?.updatedAt ? 'Kayıtlı' : 'Varsayılan'} tone={savedSettings?.updatedAt ? 'success' : 'warning'} />
      </View>

      <View style={styles.formPanel}>
        <Field label="Cihaz adı" value={values.deviceName} onChangeText={(value) => updateValue('deviceName', value)} />
        <Field label="Şube" value={values.branchName} onChangeText={(value) => updateValue('branchName', value)} autoCapitalize="characters" />
        <Field label="Depo" value={values.warehouseName} onChangeText={(value) => updateValue('warehouseName', value)} autoCapitalize="characters" />
        <Field label="Varsayılan personel kodu" value={values.defaultPersonnelCode} onChangeText={(value) => updateValue('defaultPersonnelCode', value)} autoCapitalize="characters" />

        <View style={styles.field}>
          <Text style={styles.label}>Varsayılan para birimi</Text>
          <View style={styles.currencyRow}>
            {currencyOptions.map((currency) => {
              const active = values.defaultSaleCurrency === currency;
              return (
                <Pressable key={currency} onPress={() => updateValue('defaultSaleCurrency', currency)} style={({ pressed }) => [styles.currencyButton, active && styles.currencyButtonActive, pressed && styles.pressed]}>
                  <Text style={[styles.currencyText, active && styles.currencyTextActive]}>{currency}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field label="API adresi" value={values.apiBaseUrl} onChangeText={(value) => updateValue('apiBaseUrl', value)} autoCapitalize="none" />
      </View>

      {validation.length > 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Kontrol gerekli</Text>
          <Text style={styles.errorText}>{validation[0]}</Text>
        </View>
      ) : null}

      <AppButton label="Terminal Ayarlarını Kaydet" onPress={save} compact />

      {savedSettings?.updatedAt ? (
        <View style={styles.metaBox}>
          <Text style={styles.metaText}>Son güncelleme: {new Date(savedSettings.updatedAt).toLocaleString('tr-TR')}</Text>
          <Text style={styles.metaText}>Storage key: melisa-terminal:terminal-settings</Text>
        </View>
      ) : null}
    </ScreenShell>
  );
}

function Field({ label, value, onChangeText, autoCapitalize = 'sentences' }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTextBlock: { flex: 1, gap: 2 },
  summaryTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  summaryText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  formPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  field: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '800',
  },
  currencyRow: { flexDirection: 'row', gap: spacing.xs },
  currencyButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  currencyText: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  currencyTextActive: { color: colors.surface },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    padding: spacing.sm,
    gap: 2,
  },
  errorTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  errorText: { color: colors.text, fontSize: typography.small, fontWeight: '800' },
  metaBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  metaText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  pressed: { opacity: 0.86 },
});
