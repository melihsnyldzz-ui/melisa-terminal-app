import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getOpenDocumentsMock } from '../../services/api';
import type { OpenDocument } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type OpenDocumentsScreenProps = {
  onBack: () => void;
};

export function OpenDocumentsScreen({ onBack }: OpenDocumentsScreenProps) {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getOpenDocumentsMock().then(setDocuments);
  }, []);

  const showMockAction = (action: string, documentNo: string) => {
    setBanner({ message: `${documentNo} için "${action}" işlemi hazırlandı.`, tone: action === 'Gönder' ? 'warning' : 'info' });
  };

  return (
    <ScreenShell title="Açık Fişler" subtitle="Satış fişlerini operasyon listesinde izle" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <InfoCard title="Canlı fiş takibi" subtitle="Açık, bekleyen ve gönderilemeyen fişler tek ekranda ayrışır." />
      {documents.length === 0 ? (
        <EmptyState badge="FİŞ" title="Açık fiş yok" description="Yeni satış başlatarak ilk fişi oluşturabilirsin." />
      ) : (
        documents.map((document) => (
          <View key={document.id} style={[styles.card, document.status === 'Gönderilemedi' && styles.failedCard]}>
            <View style={styles.topRow}>
              <View style={styles.documentCode}>
                <Text style={styles.documentCodeText}>{document.id.replace('FIS-', '')}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.customer}>{document.customerName}</Text>
                <Text style={styles.meta}>{document.itemCount} ürün · {document.updatedAt}</Text>
              </View>
              <StatusPill label={document.status} tone={statusToneFor(document.status)} />
            </View>
            <ActionRow
              actions={[
                { label: 'Aç', onPress: () => showMockAction('Aç', document.id), variant: 'quiet' },
                { label: 'QR Albüm', onPress: () => showMockAction('QR Albüm', document.id), variant: 'secondary' },
                { label: 'Gönder', onPress: () => showMockAction('Gönder', document.id), variant: 'primary' },
              ]}
            />
          </View>
        ))
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  failedCard: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  documentCode: {
    width: 48,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCodeText: { color: colors.surface, fontWeight: '900', fontSize: typography.small },
  detail: { flex: 1, gap: 2 },
  customer: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: typography.small, fontWeight: '700' },
});
