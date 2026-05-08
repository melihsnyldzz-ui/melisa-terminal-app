import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { loadActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type QRAlbumScreenProps = {
  onBack: () => void;
};

export function QRAlbumScreen({ onBack }: QRAlbumScreenProps) {
  const [draft, setDraft] = useState<ActiveSaleDraft | null>(null);
  const [albumReady, setAlbumReady] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadActiveSaleDraft().then(setDraft);
  }, []);

  const totalQuantity = useMemo(() => draft?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0, [draft]);
  const albumStatus = albumReady || (draft?.lines.length ?? 0) > 0 ? 'Hazır' : 'Taslak';
  const albumLink = draft ? `melisababy.com/a/${draft.documentNo}-x8Kp92` : '';

  const showAction = (message: string, tone: ToastTone = 'success') => {
    setAlbumReady(true);
    setBanner({ message, tone });
  };

  return (
    <ScreenShell title="QR Albüm" subtitle="Müşteri albümü" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      {!draft ? (
        <EmptyState badge="QR" title="QR albüm hazırlanacak fiş yok" description="Yeni fiş başlatıp ürün eklediğinizde albüm burada hazırlanır." />
      ) : (
        <>
          <InfoCard title="Albüm özeti">
            <SummaryRow label="Fiş No" value={draft.documentNo} />
            <SummaryRow label="Müşteri" value={draft.customerName} />
            <SummaryRow label="Ürün kalemi" value={draft.lines.length.toString()} />
            <SummaryRow label="Toplam adet" value={totalQuantity.toString()} />
            <View style={styles.albumMeta}>
              <StatusPill label={albumStatus} tone={albumStatus === 'Hazır' ? 'success' : 'warning'} />
              <StatusPill label="Fiyat gösterilmez" tone="dark" />
            </View>
          </InfoCard>

          <View style={styles.qrPanel}>
            <View style={styles.qrBox}>
              <View style={styles.qrGrid}>
                {Array.from({ length: 25 }).map((_, index) => (
                  <View key={index} style={[styles.qrCell, index % 2 === 0 || [7, 11, 13, 18, 21].includes(index) ? styles.qrCellDark : null]} />
                ))}
              </View>
            </View>
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Güvenli bağlantı</Text>
              <Text style={styles.qrLink} numberOfLines={1}>{albumLink}</Text>
            </View>
          </View>

          <InfoCard title="WhatsApp mesajı" subtitle="Merhaba, ürün görsellerine aşağıdaki bağlantıdan ulaşabilirsiniz." />

          <View style={styles.grid}>
            {draft.lines.map((item) => (
              <View key={item.lineId} style={styles.productCard}>
                <View style={styles.imageBox}>
                  <Text style={styles.imageCode}>{item.code}</Text>
                  <Text style={styles.imageText}>Görsel</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productCode}>{item.code}</Text>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.color} · {item.size} · Adet {item.quantity}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actionGrid}>
            <ActionRow
              actions={[
                { label: 'QR Oluştur / Yenile', onPress: () => showAction('QR albüm hazırlandı.'), variant: 'primary' },
                { label: 'Linki Kopyala', onPress: () => showAction('Albüm bağlantısı kopyalandı.'), variant: 'secondary' },
              ]}
            />
            <ActionRow
              actions={[
                { label: 'WhatsApp ile Gönder', onPress: () => showAction('WhatsApp mesajı hazırlandı.'), variant: 'dark' },
                { label: 'Görselleri Hazırla', onPress: () => showAction('Ürün görselleri hazırlandı.'), variant: 'quiet' },
              ]}
            />
          </View>
        </>
      )}
    </ScreenShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  albumMeta: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { color: colors.muted, fontWeight: '800', fontSize: typography.small },
  summaryValue: { color: colors.ink, fontWeight: '900', fontSize: typography.body, flexShrink: 1, textAlign: 'right' },
  qrPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrBox: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 6,
    borderColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrGrid: {
    width: 76,
    height: 76,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  qrCell: {
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
  },
  qrCellDark: {
    backgroundColor: colors.anthracite,
  },
  linkBox: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  qrLink: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  grid: { gap: spacing.sm },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageBox: {
    width: 66,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  imageCode: { color: colors.red, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  imageText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '800' },
  productInfo: { flex: 1, gap: spacing.xs },
  productCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMeta: { color: colors.muted, fontWeight: '800', fontSize: typography.small },
  actionGrid: { gap: spacing.xs },
});
