import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getOpenDocumentsMock } from '../../services/api';
import type { OpenDocument, OpenDocumentStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type OpenDocumentsScreenProps = {
  onBack: () => void;
};

const statusColors: Record<OpenDocumentStatus, { bg: string; fg: string }> = {
  Açık: { bg: colors.successSoft, fg: colors.success },
  Beklemede: { bg: colors.warningSoft, fg: colors.amber },
  Gönderilemedi: { bg: colors.dangerSoft, fg: colors.red },
};

export function OpenDocumentsScreen({ onBack }: OpenDocumentsScreenProps) {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);

  useEffect(() => {
    getOpenDocumentsMock().then(setDocuments);
  }, []);

  return (
    <ScreenShell title="Açık Fişler" subtitle="Kompakt mock fiş listesi" onBack={onBack}>
      <InfoCard title="Canlı fiş takibi" subtitle="Açık, bekleyen ve gönderilemeyen fişler operasyon listesinde ayrışır." />
      {documents.map((document) => {
        const status = statusColors[document.status];
        return (
          <View key={document.id} style={styles.row}>
            <View style={styles.documentCode}>
              <Text style={styles.documentCodeText}>{document.id.replace('FIS-', '')}</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.customer}>{document.customerName}</Text>
              <Text style={styles.meta}>{document.itemCount} ürün · {document.updatedAt}</Text>
            </View>
            <View style={[styles.status, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{document.status}</Text>
            </View>
          </View>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  documentCode: {
    width: 48,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCodeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  detail: {
    flex: 1,
    gap: 2,
  },
  customer: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  status: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
