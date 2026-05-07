import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getQRAlbumMock } from '../../services/api';
import type { QRAlbum } from '../../types';
import { colors } from '../theme';

type QRAlbumScreenProps = {
  onBack: () => void;
};

export function QRAlbumScreen({ onBack }: QRAlbumScreenProps) {
  const [album, setAlbum] = useState<QRAlbum | null>(null);

  useEffect(() => {
    getQRAlbumMock().then(setAlbum);
  }, []);

  return (
    <ScreenShell title="QR Albüm" subtitle="Fiyat göstermeyen mock ürün albümü" onBack={onBack}>
      <InfoCard title={`Fiş: ${album?.documentNo ?? 'Yükleniyor'}`} subtitle={`${album?.customerLabel ?? 'Müşteri'} için ürün görsel önizlemesi`} />
      <View style={styles.grid}>
        {album?.items.map((item) => (
          <View key={item.id} style={styles.productCard}>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Görsel</Text>
            </View>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>{item.color} · {item.size}</Text>
          </View>
        ))}
      </View>
      <AppButton label="Tüm Görselleri İndir" onPress={() => undefined} variant="secondary" />
      <AppButton label="WhatsApp ile İletişim" onPress={() => undefined} variant="dark" />
      <InfoCard title="Fiyat güvenliği" subtitle="QR albüm mock önizlemede fiyat bilgisi gösterilmez." tone="success" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  productCard: { backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.lightGray, padding: 12, gap: 8 },
  placeholder: { height: 120, borderRadius: 8, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  productName: { color: colors.black, fontSize: 17, fontWeight: '900' },
  productMeta: { color: colors.gray, fontWeight: '700' },
});
