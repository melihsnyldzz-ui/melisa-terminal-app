import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { getOpenDocumentsMock } from '../../services/api';
import type { OpenDocument } from '../../types';
import { colors } from '../theme';

type OpenDocumentsScreenProps = {
  onBack: () => void;
};

export function OpenDocumentsScreen({ onBack }: OpenDocumentsScreenProps) {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);

  useEffect(() => {
    getOpenDocumentsMock().then(setDocuments);
  }, []);

  return (
    <ScreenShell title="Açık Fişler" subtitle="Mock açık fiş listesi" onBack={onBack}>
      {documents.map((document) => (
        <InfoCard key={document.id} title={`${document.id} · ${document.customerName}`} subtitle={`${document.itemCount} ürün · ${document.updatedAt}`} tone={document.status === 'Gönderilemedi' ? 'danger' : document.status === 'Beklemede' ? 'warning' : 'success'}>
          <View style={styles.status}>
            <Text style={styles.statusText}>{document.status}</Text>
          </View>
        </InfoCard>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  status: { alignSelf: 'flex-start', backgroundColor: colors.black, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: colors.white, fontWeight: '900' },
});
