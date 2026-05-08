import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { createSaleMock } from '../../services/api';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('Henüz başlamadı');
  const [itemCount, setItemCount] = useState(0);

  const startSale = async () => {
    const sale = await createSaleMock(customer);
    setDocumentNo(sale.documentNo);
    setItemCount(sale.itemCount);
  };

  return (
    <ScreenShell title="Yeni Fiş / Satış" subtitle="Canlı fiş mock çalışma alanı" onBack={onBack}>
      <View style={styles.formPanel}>
        <Text style={styles.label}>Müşteri seç</Text>
        <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri etiketi yaz" placeholderTextColor={colors.muted} style={styles.input} />
        <View style={styles.actionRow}>
          <AppButton label="Fiş Başlat" onPress={startSale} />
          <AppButton label="Ürün Ekle / Tara" onPress={() => setItemCount((current) => current + 1)} variant="dark" />
        </View>
      </View>

      <InfoCard title="Fiş özeti" subtitle={documentNo}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Müşteri</Text>
          <Text style={styles.summaryValue}>{customer || 'Seçilmedi'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ürün adedi</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
      </InfoCard>
      <AppButton label="QR Albüm Oluştur" onPress={() => undefined} variant="secondary" />
      <InfoCard title="Güvenlik notu" subtitle="Bu ekran gerçek fiş kaydı, fiyat hesaplama veya Vega / SQL yazma işlemi yapmaz." tone="warning" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  formPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  label: {
    color: colors.anthracite,
    fontSize: typography.body,
    fontWeight: '900',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
  },
  actionRow: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    color: colors.muted,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.ink,
    fontWeight: '900',
  },
});
