import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { colors, radius, spacing, typography } from '../theme';

type DataUpdateScreenProps = {
  onBack: () => void;
};

type SyncMetricProps = {
  label: string;
  value: string;
  tone?: 'dark' | 'success' | 'warning';
};

export function DataUpdateScreen({ onBack }: DataUpdateScreenProps) {
  const [lastSync, setLastSync] = useState('Bugün 09:40');
  const [progress, setProgress] = useState('Bekliyor');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const updateData = () => {
    const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setLastSync(`Bugün ${nextSync}`);
    setProgress('Tamamlandı');
    setBanner({ message: 'Ürün, stok ve fiş hazırlıkları güncellendi.', tone: 'success' });
  };

  return (
    <ScreenShell title="Veri Güncelle" subtitle="Mock senkron merkezi" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.panelTitle}>Senkron durumu</Text>
            <Text style={styles.panelSubtitle}>Gerçek bağlantı yok; bu ekran prova ve kontrol amaçlıdır.</Text>
          </View>
          <StatusPill label={progress} tone={progress === 'Tamamlandı' ? 'success' : 'warning'} />
        </View>
        <View style={styles.metricGrid}>
          <SyncMetric label="Son güncelleme" value={lastSync} />
          <SyncMetric label="Ürün/stok" value={progress === 'Tamamlandı' ? 'Güncel' : 'Bekliyor'} tone={progress === 'Tamamlandı' ? 'success' : 'warning'} />
        </View>
        <View style={styles.checkList}>
          <Text style={styles.checkTitle}>Kontrol kapsamı</Text>
          <Text style={styles.checkItem}>• Ürün kartları mock olarak hazırlanır</Text>
          <Text style={styles.checkItem}>• Stok göstergeleri prova modunda izlenir</Text>
          <Text style={styles.checkItem}>• Bekleyen fişler korunur</Text>
        </View>
        <AppButton label="Mock Veri Güncelle" onPress={updateData} />
      </View>
      <InfoCard title="Çevrimdışı güvenlik" subtitle="Bekleyen belgeler korunur; gerçek bağlantı ileriki fazdadır." tone="success" />
    </ScreenShell>
  );
}

function SyncMetric({ label, value, tone = 'dark' }: SyncMetricProps) {
  return (
    <View style={styles.metricBox}>
      <Text style={[styles.metricValue, tone === 'success' && styles.metricSuccess, tone === 'warning' && styles.metricWarning]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerTextBlock: { flex: 1, gap: 2 },
  panelTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  panelSubtitle: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  metricGrid: { flexDirection: 'row', gap: spacing.xs },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  metricValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  metricSuccess: { color: colors.success },
  metricWarning: { color: colors.amber },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  checkList: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 3,
  },
  checkTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  checkItem: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
