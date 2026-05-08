import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getQRAlbumMock } from '../../services/api';
import type { QRAlbum } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type QRAlbumScreenProps = {
  onBack: () => void;
};

export function QRAlbumScreen({ onBack }: QRAlbumScreenProps) {
  const [album, setAlbum] = useState<QRAlbum | null>(null);

  useEffect(() => {
    getQRAlbumMock().then(setAlbum);
  }, []);

  return (
    <ScreenShell title="QR Albüm" subtitle="Fiyat göstermeyen ürün görsel önizlemesi" onBack={onBack}>
      <InfoCard title={`Fiş ${album?.documentNo ?? 'yükleniyor'}`} subtitle={`${album?.customerLabel ?? 'Müşteri'} için mock albüm görünümü`} tone="dark" />
      <View style={styles.grid}>
        {album?.items.map((item, index) => (
          <View key={item.id} style={styles.productCard}>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderCode}>P{index + 1}</Text>
              <Text style={styles.placeholderText}>Fotoğraf</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>{item.color} · {item.size}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <AppButton label="Tüm Görselleri İndir" onPress={() => undefined} />
        <AppButton label="WhatsApp ile İletişim" onPress={() => undefined} variant="dark" />
      </View>
      <InfoCard title="Fiyat gösterimi kapalı" subtitle="QR albüm mock önizlemede fiyat bilgisi gösterilmez." tone="success" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  placeholder: {
    width: 96,
    height: 82,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  placeholderCode: {
    color: colors.red,
    fontSize: typography.section,
    fontWeight: '900',
  },
  placeholderText: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '800',
  },
  productInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  productName: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  productMeta: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: typography.small,
  },
  actions: {
    gap: spacing.sm,
  },
});
