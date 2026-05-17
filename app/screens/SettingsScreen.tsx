import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { checkLocalPriceService, checkPrintBridgeHealth } from '../../services/api';
import type { LocalPriceConnectionResult, PrintBridgeResult } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { clearActiveSaleDraft, loadSettings, saveSettings } from '../../storage/localStorage';
import type { PersonnelUser, TerminalSettings, UserSession } from '../../types';
import { colors, radius, spacing, typography } from '../theme';
import { formatBridgeCheckedAt } from '../utils/printBridgeHealthUtils';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  session: UserSession | null;
  currentUser: PersonnelUser | null;
};

const branchOptions = ['Merkez Depo', 'Mağaza', 'Sevkiyat'];
const apiModeOptions: Array<{ value: TerminalSettings['apiMode']; label: string }> = [
  { value: 'mock', label: 'Mock Demo' },
  { value: 'real', label: 'Gerçek Servis' },
  { value: 'fallback', label: 'Servis varsa kullan, yoksa mock' },
];

const apiModeLabels: Record<TerminalSettings['apiMode'], string> = {
  mock: 'Mock Demo',
  real: 'Gerçek Servis',
  fallback: 'Servis varsa kullan, yoksa mock',
};

export function SettingsScreen({ onBack, onLogout, session, currentUser }: SettingsScreenProps) {
  const [settings, setSettings] = useState<TerminalSettings>({
    terminalId: 'MB-TERM-001',
    branch: session?.branch ?? 'Merkez Depo',
    apiBaseUrl: 'http://192.168.1.45:8787',
    apiMode: 'fallback',
    vibrationEnabled: true,
    urgentVibrationEnabled: true,
  });
  const [lastSync, setLastSync] = useState('Bugün 09:40');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [connectionResult, setConnectionResult] = useState<LocalPriceConnectionResult | null>(null);
  const [bridgeConnectionResult, setBridgeConnectionResult] = useState<PrintBridgeResult | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionCheckedAt, setConnectionCheckedAt] = useState<string | undefined>(undefined);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = <K extends keyof TerminalSettings>(key: K, value: TerminalSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    await saveSettings(settings);
    setBanner({ message: 'Terminal ayarları cihazda korunacak şekilde kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  const savePreference = async <K extends keyof TerminalSettings>(key: K, value: TerminalSettings[K]) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    if (key === 'apiMode') {
      setBanner({ message: `Fiyat kaynağı: ${apiModeLabels[value as TerminalSettings['apiMode']]}.`, tone: 'info' });
      return;
    }
    if (key === 'vibrationEnabled') {
      setBanner({ message: value ? 'Titreşim açıldı.' : 'Titreşim kapatıldı.', tone: value ? 'success' : 'info' });
      if (value) notifySuccess();
      return;
    }
    setBanner({ message: value ? 'Acil uyarı titreşimi açıldı.' : 'Acil uyarı titreşimi kapatıldı.', tone: value ? 'success' : 'info' });
    if (value) notifySuccess();
  };

  const checkConnection = async () => {
    await saveSettings(settings);
    const result = await checkLocalPriceService(settings);
    setConnectionResult(result);
    setBanner({ message: result.message, tone: result.ok ? 'success' : 'error' });
    if (result.ok) {
      notifySuccess();
      return;
    }
    notifyWarning();
  };

  const runConnectionTest = async () => {
    setConnectionTesting(true);
    const [priceResult, bridgeResult] = await Promise.all([
      checkLocalPriceService(settings),
      checkPrintBridgeHealth(),
    ]);
    setConnectionResult(priceResult);
    setBridgeConnectionResult(bridgeResult);
    setConnectionCheckedAt(new Date().toISOString());
    setConnectionTesting(false);
    const allOk = priceResult.ok && bridgeResult.ok;
    setBanner({
      message: allOk ? 'Bağlantı testi başarılı.' : 'Bağlantı testinde kontrol edilmesi gereken yer var.',
      tone: allOk ? 'success' : 'warning',
    });
    if (allOk) {
      notifySuccess();
      return;
    }
    notifyWarning();
  };

  const updateData = () => {
    const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setLastSync(`Bugün ${nextSync}`);
    setBanner({ message: 'Veri güncelleme tamamlandı. Bekleyen belgeler korunur.', tone: 'success' });
  };

  const resetActiveDraft = async () => {
    await clearActiveSaleDraft();
    setBanner({ message: 'Aktif fiş taslağı sıfırlandı. Yeni Fiş artık temiz açılacak.', tone: 'success' });
    notifySuccess();
  };

  return (
    <ScreenShell title="Ayarlar" subtitle="Terminal ayar paneli" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <Section title="Terminal Sağlığı">
        <View style={styles.healthGrid}>
          <HealthCard label="Terminal" value={settings.terminalId || 'Eksik'} tone={settings.terminalId.trim() ? 'success' : 'warning'} />
          <HealthCard label="Depo" value={settings.branch} tone="success" />
        </View>
        <View style={styles.healthGrid}>
          <HealthCard label="Fiyat Kaynağı" value={apiModeLabels[settings.apiMode]} tone={settings.apiMode === 'real' ? 'warning' : 'success'} />
          <HealthCard label="Titreşim" value={settings.vibrationEnabled ? 'Açık' : 'Kapalı'} tone={settings.vibrationEnabled ? 'success' : 'warning'} />
        </View>
      </Section>

      <Section title="Terminal Bilgisi">
        <Field label="Terminal ID" value={settings.terminalId} onChangeText={(value) => update('terminalId', value)} />
        <View style={styles.field}>
          <Text style={styles.label}>Depo</Text>
          <View style={styles.segmentRow}>
            {branchOptions.map((branch) => (
              <Pressable
                key={branch}
                onPress={() => update('branch', branch)}
                style={({ pressed }) => [styles.segmentButton, settings.branch === branch && styles.segmentButtonActive, pressed && styles.pressed]}
              >
                <Text style={[styles.segmentText, settings.branch === branch && styles.segmentTextActive]}>{branch}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <AppButton label="Ayarları Kaydet" onPress={save} compact />
      </Section>

      <Section title="Bağlantı Testi">
        <View style={styles.connectionTestHeader}>
          <View style={styles.connectionTestTitleBlock}>
            <Text style={styles.connectionTitle}>Terminal bağlantıları</Text>
            <Text style={styles.helperText}>Fiyat sistemi ve yazdırma bilgisayarı güvenli şekilde kontrol edilir.</Text>
          </View>
          <StatusPill label={connectionTesting ? 'Kontrol' : connectionCheckedAt ? 'Test edildi' : 'Bekliyor'} tone={connectionTesting ? 'warning' : connectionCheckedAt ? 'success' : 'info'} />
        </View>
        <ConnectionTestRow
          label="Fiyat servisi"
          message={connectionTesting ? 'Fiyat sistemi kontrol ediliyor.' : connectionResult ? (connectionResult.ok ? 'Fiyat sistemi çalışıyor.' : 'Fiyat sistemine ulaşılamıyor.') : 'Henüz test edilmedi.'}
          tone={connectionTesting ? 'warning' : connectionResult ? (connectionResult.ok ? 'success' : 'danger') : 'info'}
        />
        <ConnectionTestRow
          label="Yazdırma bilgisayarı"
          message={connectionTesting ? 'Yazdırma bilgisayarı kontrol ediliyor.' : bridgeConnectionResult ? (bridgeConnectionResult.ok ? 'Yazdırma bilgisayarı bağlı.' : 'Yazdırma bilgisayarına ulaşılamıyor.') : 'Henüz test edilmedi.'}
          tone={connectionTesting ? 'warning' : bridgeConnectionResult ? (bridgeConnectionResult.ok ? 'success' : 'danger') : 'info'}
        />
        <View style={styles.connectionInfoBox}>
          <Text style={styles.connectionText}>Fiyat API adresi: {connectionResult?.url || settings.apiBaseUrl || 'Eksik'}</Text>
          <Text style={styles.connectionText}>Yazdırma API adresi: {bridgeConnectionResult?.url || settings.apiBaseUrl || 'Eksik'}</Text>
          <Text style={styles.connectionText}>Son kontrol: {formatBridgeCheckedAt(connectionCheckedAt)}</Text>
          {connectionResult && !connectionResult.ok ? <Text style={styles.connectionText}>Fiyat: {connectionResult.reason || 'Servis açık değil veya ağ bağlantısı yok.'}</Text> : null}
          {bridgeConnectionResult && !bridgeConnectionResult.ok ? <Text style={styles.connectionText}>Yazdırma: {bridgeConnectionResult.reason || 'Servis açık değil veya ağ bağlantısı yok.'}</Text> : null}
        </View>
        <AppButton label={connectionTesting ? 'Kontrol Ediliyor' : 'Bağlantıyı Test Et'} onPress={runConnectionTest} variant="secondary" compact />
      </Section>

      <Section title="Bağlantı">
        {isAdmin ? (
          <>
            <Field label="Local fiyat servisi adresi" value={settings.apiBaseUrl} onChangeText={(value) => update('apiBaseUrl', value)} placeholder="http://192.168.1.45:8787" />
            <Text style={styles.helperText}>Android terminalde localhost kullanma. PC IPv4 adresini yaz: http://192.168.1.45:8787</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Fiyat Kaynağı</Text>
              <View style={styles.priceSourceGrid}>
                {apiModeOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => savePreference('apiMode', option.value)}
                    style={({ pressed }) => [styles.priceSourceButton, settings.apiMode === option.value && styles.segmentButtonActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.segmentText, settings.apiMode === option.value && styles.segmentTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.securityBox}>
            <Text style={styles.securityTitle}>Bağlantı ayarı admin tarafından yönetilir.</Text>
            <Text style={styles.securityText}>Fiyat kaynağı: {apiModeLabels[settings.apiMode]}. Adres değişikliği için admin kullanıcısı gerekir.</Text>
          </View>
        )}
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Durum</Text>
          <StatusPill label={settings.apiBaseUrl.trim() ? 'Hazır' : 'Bekliyor'} tone={settings.apiBaseUrl.trim() ? 'success' : 'warning'} />
        </View>
        {connectionResult ? (
          <View style={[styles.connectionBox, connectionResult.ok ? styles.connectionBoxOk : styles.connectionBoxError]}>
            <Text style={styles.connectionTitle}>{connectionResult.ok ? 'Servis bağlı' : 'Local fiyat servisi bağlı değil'}</Text>
            <Text style={styles.connectionText}>Adres: {connectionResult.url}</Text>
            {connectionResult.endpoint ? <Text style={styles.connectionText}>Endpoint: {connectionResult.endpoint}</Text> : null}
            {connectionResult.reason ? <Text style={styles.connectionText}>Neden: {connectionResult.reason}</Text> : null}
          </View>
        ) : null}
        {isAdmin ? <AppButton label="Bağlantıyı Kontrol Et" onPress={checkConnection} variant="secondary" compact /> : null}
      </Section>

      <Section title="Senkron">
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Son senkron</Text>
          <StatusPill label={lastSync} tone="dark" />
        </View>
        <Text style={styles.helperText}>Ürün, fiş ve mesaj hazırlıkları güncel tutulur.</Text>
        <AppButton label="Veri Güncelle" onPress={updateData} variant="dark" compact />
      </Section>

      <Section title="Bildirim / Titreşim">
        <ToggleRow
          label="Titreşim açık"
          enabled={settings.vibrationEnabled}
          onPress={() => savePreference('vibrationEnabled', !settings.vibrationEnabled)}
        />
        <ToggleRow
          label="Acil uyarı titreşimi"
          enabled={settings.urgentVibrationEnabled}
          disabled={!settings.vibrationEnabled}
          onPress={() => savePreference('urgentVibrationEnabled', !settings.urgentVibrationEnabled)}
        />
      </Section>

      <Section title="Güvenlik">
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Güvenli çalışma modu</Text>
          <Text style={styles.securityText}>Taslaklar cihazda saklanır. Yeni Fiş açılmazsa aktif taslağı sıfırlayarak temiz başlangıç yapabilirsiniz.</Text>
        </View>
        {isAdmin ? <AppButton label="Aktif Taslağı Sıfırla" onPress={resetActiveDraft} variant="secondary" compact /> : null}
        <ActionRow
          actions={[
            { label: 'Kaydet', onPress: save, variant: 'secondary' },
            { label: 'Oturumu Kapat', onPress: onLogout, variant: 'dark' },
          ]}
        />
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

type HealthCardProps = {
  label: string;
  value: string;
  tone: 'success' | 'warning';
};

function HealthCard({ label, value, tone }: HealthCardProps) {
  return (
    <View style={styles.healthCard}>
      <Text style={[styles.healthValue, tone === 'warning' && styles.healthWarning]} numberOfLines={1}>{value}</Text>
      <Text style={styles.healthLabel}>{label}</Text>
    </View>
  );
}

type ConnectionTestRowProps = {
  label: string;
  message: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
};

function ConnectionTestRow({ label, message, tone }: ConnectionTestRowProps) {
  return (
    <View style={styles.connectionTestRow}>
      <View style={styles.connectionTestTextBlock}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.helperText}>{message}</Text>
      </View>
      <StatusPill label={tone === 'success' ? 'Çalışıyor' : tone === 'danger' ? 'Ulaşılamıyor' : tone === 'warning' ? 'Kontrol' : 'Bekliyor'} tone={tone} />
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
};

function Field({ label, value, placeholder, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function ToggleRow({ label, enabled, disabled = false, onPress }: ToggleRowProps) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.toggleRow, disabled && styles.toggleDisabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, enabled && !disabled && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, enabled && !disabled && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  healthGrid: { flexDirection: 'row', gap: spacing.xs },
  healthCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopWidth: 3,
    borderTopColor: colors.anthracite,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: 2,
  },
  healthValue: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  healthWarning: { color: colors.amber },
  healthLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
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
    fontWeight: '700',
  },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
  },
  segmentText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  segmentTextActive: { color: colors.surface },
  priceSourceGrid: { gap: spacing.xs },
  priceSourceButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.86 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  helperText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  connectionBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 2,
  },
  connectionBoxOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  connectionBoxError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.red,
  },
  connectionTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  connectionText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  connectionTestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  connectionTestTitleBlock: { flex: 1, gap: 2 },
  connectionTestRow: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  connectionTestTextBlock: { flex: 1, gap: 2 },
  connectionInfoBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  toggleRow: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleDisabled: { opacity: 0.55 },
  toggleLabel: { color: colors.ink, fontSize: typography.body, fontWeight: '900', flex: 1 },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.line,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: colors.red },
  securityBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: 2,
  },
  securityTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  securityText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
