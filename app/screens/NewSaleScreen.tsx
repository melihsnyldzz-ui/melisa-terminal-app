import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { createSaleMock } from '../../services/api';
import { colors } from '../theme';

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
    <ScreenShell title="Yeni Fiş / Satış" subtitle="Mock fiş hazırlığı" onBack={onBack}>
      <Text style={styles.label}>Müşteri seç</Text>
      <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri etiketi yaz" placeholderTextColor={colors.gray} style={styles.input} />
      <AppButton label="Fiş Başlat" onPress={startSale} />
      <AppButton label="Ürün Ekle / Tara" onPress={() => setItemCount((current) => current + 1)} variant="dark" />
      <InfoCard title="Fiş özeti" subtitle={`Fiş: ${documentNo}`}>
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
  label: { color: colors.black, fontSize: 16, fontWeight: '900' },
  input: { minHeight: 58, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, color: colors.black, fontSize: 18, paddingHorizontal: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: colors.gray, fontWeight: '800' },
  summaryValue: { color: colors.black, fontWeight: '900' },
});
