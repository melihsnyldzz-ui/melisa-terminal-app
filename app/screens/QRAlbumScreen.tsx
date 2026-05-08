import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getQRAlbumMock } from '../../services/api';
import type { QRAlbum } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type QRAlbumScreenProps = {
  onBack: () => void;
};

export function QRAlbumScreen({ onBack }: QRAlbumScreenProps) {
  const [album, setAlbum] = useState<QRAlbum | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getQRAlbumMock().then(setAlbum);
  }, []);

  const showMockAction = (action: string) => {
    setBanner({ message: `${action} hazırlandı. Paylaşım onay bekliyor.`, tone: 'success' });
  };

  return (
    <ScreenShell title="QR Albüm" subtitle="Ürün görsel albümü" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <InfoCard title={`Fiş ${album?.documentNo ?? 'yükleniyor'}`} subtitle={album?.customerLabel ?? 'Müşteri'}>
        <View style={styles.albumMeta}>
          <StatusPill label={album?.status ?? 'Taslak'} tone={album?.status === 'Hazır' ? 'success' : 'warning'} />
          <StatusPill label={`${album?.items.length ?? 0} ürün`} tone="dark" />
        </View>
      </InfoCard>

      <View style={styles.qrPanel}>
        <View style={styles.qrBox}>
          <Text style={styles.qrText}>QR</Text>
        </View>
        <Text style={styles.qrLink}>https://melisababy.com/a/{album?.documentNo ?? 'FIS-1024'}-x8Kp92</Text>
      </View>

      <View style={styles.grid}>
        {album?.items.map((item, index) => (
          <View key={item.id} style={styles.productCard}>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderCode}>{item.code}</Text>
              <Text style={styles.placeholderText}>Fotoğraf</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>{item.code} · {item.color} · {item.size}</Text>
            </View>
          </View>
        ))}
      </View>

      <ActionRow
        actions={[
          { label: 'QR Yenile', onPress: () => showMockAction('QR yenileme'), variant: 'primary' },
          { label: 'Kopyala', onPress: () => showMockAction('Link kopyalama'), variant: 'secondary' },
          { label: 'WhatsApp', onPress: () => showMockAction('WhatsApp gönderimi'), variant: 'dark' },
        ]}
      />
      <InfoCard title="Fiyat gösterilmez" subtitle="Sadece ürün görselleri vardır." tone="success" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  albumMeta: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  qrPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrBox: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 6,
    borderColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: { color: colors.red, fontSize: 26, fontWeight: '900' },
  qrLink: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  grid: { gap: spacing.sm },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholder: {
    width: 72,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  placeholderCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  placeholderText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '800' },
  productInfo: { flex: 1, gap: spacing.xs },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMeta: { color: colors.muted, fontWeight: '700', fontSize: typography.small },
});
