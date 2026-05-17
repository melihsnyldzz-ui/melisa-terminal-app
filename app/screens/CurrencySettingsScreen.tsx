import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addAuditLog, loadSession } from '../../storage/localStorage';
import type { CurrencySettings, ExchangeRateSnapshot } from '../../types';
import { DEFAULT_EXCHANGE_RATES, loadCurrencySettings, saveCurrencySettings } from '../utils/currencyUtils';
import { colors, radius, spacing, typography } from '../theme';

type CurrencySettingsScreenProps = {
  onBack: () => void;
};

type RateKey = keyof ExchangeRateSnapshot;

const rateFields: Array<{ key: RateKey; label: string; warningLimit: number }> = [
  { key: 'USD_TO_TRY', label: 'USD_TO_TRY', warningLimit: 1000 },
  { key: 'EUR_TO_TRY', label: 'EUR_TO_TRY', warningLimit: 1000 },
  { key: 'EUR_TO_USD', label: 'EUR_TO_USD', warningLimit: 20 },
  { key: 'USD_TO_EUR', label: 'USD_TO_EUR', warningLimit: 20 },
];

const toInputState = (settings: ExchangeRateSnapshot) => ({
  USD_TO_TRY: String(settings.USD_TO_TRY),
  EUR_TO_TRY: String(settings.EUR_TO_TRY),
  EUR_TO_USD: String(settings.EUR_TO_USD),
  USD_TO_EUR: String(settings.USD_TO_EUR),
});

const parseRate = (value: string) => Number(value.replace(',', '.'));

export function CurrencySettingsScreen({ onBack }: CurrencySettingsScreenProps) {
  const [values, setValues] = useState<Record<RateKey, string>>(toInputState(DEFAULT_EXCHANGE_RATES));
  const [savedSettings, setSavedSettings] = useState<CurrencySettings | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadCurrencySettings().then((settings) => {
      const effective = settings || DEFAULT_EXCHANGE_RATES;
      setSavedSettings(settings);
      setValues(toInputState(effective));
    });
  }, []);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rates = {} as ExchangeRateSnapshot;

    rateFields.forEach((field) => {
      const rawValue = values[field.key].trim();
      const parsed = parseRate(rawValue);
      if (!rawValue) {
        errors.push(`${field.label} boş olamaz.`);
        return;
      }
      if (!Number.isFinite(parsed)) {
        errors.push(`${field.label} sayısal olmalı.`);
        return;
      }
      if (parsed <= 0) {
        errors.push(`${field.label} 0 veya negatif olamaz.`);
        return;
      }
      if (parsed > field.warningLimit) {
        warnings.push(`${field.label} çok yüksek görünüyor.`);
      }
      rates[field.key] = parsed;
    });

    return { errors, warnings, rates };
  }, [values]);

  const updateValue = (key: RateKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (validation.errors.length > 0) {
      setBanner({ message: validation.errors[0], tone: 'error' });
      notifyWarning();
      return;
    }

    const session = await loadSession();
    const updatedAt = new Date().toISOString();
    const updatedBy = session?.username || 'Personel';
    const nextSettings: CurrencySettings = {
      ...validation.rates,
      updatedAt,
      updatedBy,
    };
    const previousSettings = savedSettings || DEFAULT_EXCHANGE_RATES;

    await saveCurrencySettings(nextSettings);
    await addAuditLog({
      operationType: 'Kur ayarı değişti',
      description: rateFields
        .map((field) => `${field.label}: ${previousSettings[field.key]} -> ${nextSettings[field.key]}`)
        .join(' · '),
      status: validation.warnings.length > 0 ? 'warning' : 'success',
    });
    setSavedSettings(nextSettings);
    setBanner({
      message: validation.warnings.length > 0 ? `${validation.warnings[0]} Ayarlar yine de kaydedildi.` : 'Kur ayarları kaydedildi.',
      tone: validation.warnings.length > 0 ? 'warning' : 'success',
    });
    if (validation.warnings.length > 0) {
      notifyWarning();
      return;
    }
    notifySuccess();
  };

  const resetDefaults = () => {
    setValues(toInputState(DEFAULT_EXCHANGE_RATES));
    setBanner({ message: 'Varsayılan oranlar forma yüklendi. Kaydetmeden uygulanmaz.', tone: 'info' });
  };

  return (
    <ScreenShell title="Kur Ayarları" subtitle="Yerel mock kur oranları" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.summaryPanel}>
        <View style={styles.summaryTextBlock}>
          <Text style={styles.summaryTitle}>Etkin kur tablosu</Text>
          <Text style={styles.summaryText}>Satış fişi dönüşümleri bu cihazdaki kayıtlı oranlarla yapılır.</Text>
        </View>
        <StatusPill label={savedSettings ? 'Kayıtlı' : 'Varsayılan'} tone={savedSettings ? 'success' : 'warning'} />
      </View>

      <View style={styles.formPanel}>
        {rateFields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={values[field.key]}
              onChangeText={(value) => updateValue(field.key, value)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
        ))}
      </View>

      {validation.errors.length > 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Kontrol gerekli</Text>
          <Text style={styles.errorText}>{validation.errors[0]}</Text>
        </View>
      ) : validation.warnings.length > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Uyarı</Text>
          <Text style={styles.warningText}>{validation.warnings[0]}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <AppButton label="Varsayılanı Yükle" onPress={resetDefaults} variant="secondary" compact />
        <AppButton label="Kur Ayarlarını Kaydet" onPress={save} compact />
      </View>

      {savedSettings?.updatedAt ? (
        <View style={styles.metaBox}>
          <Text style={styles.metaText}>Son güncelleme: {new Date(savedSettings.updatedAt).toLocaleString('tr-TR')}</Text>
          <Text style={styles.metaText}>Güncelleyen: {savedSettings.updatedBy || 'Personel'}</Text>
        </View>
      ) : null}
    </ScreenShell>
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
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    padding: spacing.sm,
    gap: 2,
  },
  warningTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900' },
  warningText: { color: colors.text, fontSize: typography.small, fontWeight: '800' },
  actionRow: { gap: spacing.xs },
  metaBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  metaText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
});
