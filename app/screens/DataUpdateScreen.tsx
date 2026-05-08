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

export function DataUpdateScreen({ onBack }: DataUpdateScreenProps) {
  const [lastSync, setLastSync] = useState('Bugün 09:40');
  const [progress, setProgress] = useState('Bekliyor');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const updateData = () => {
    const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setLastSync(`Bugün ${nextSync}`);
    setProgress('Tamamlandı');
    setBanner({ message: 'Ürün ve stok bilgileri güncellendi. Açık fiş ve kuyruk korunur.', tone: 'success' });
  };

  return (
    <ScreenShell title="Veri Güncelle" subtitle="Ürün ve stok hazırlık kontrolü" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>Son güncelleme</Text>
          <StatusPill label={lastSync} tone="dark" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Durum</Text>
          <StatusPill label={progress} tone={progress === 'Tamamlandı' ? 'success' : 'warning'} />
        </View>
        <AppButton label="Veri Güncelle" onPress={updateData} />
      </View>
      <InfoCard title="Çevrimdışı güvenlik" subtitle="Veri güncelleme bekleyen belgeleri ve gönderilemeyen işlemleri silmez." tone="success" />
      <InfoCard title="Güvenli çalışma modu" subtitle="Bağlantı hazırlık aşamasındadır. Taslaklar cihazda korunur." tone="warning" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
});
