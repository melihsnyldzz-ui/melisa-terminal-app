import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { createSaleMock } from '../../services/api';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

const steps = ['Müşteri', 'Fiş', 'Ürün', 'QR'];

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [step, setStep] = useState(1);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const startSale = async () => {
    const sale = await createSaleMock(customer);
    setDocumentNo(sale.documentNo);
    setItemCount(sale.itemCount);
    setStep(2);
    setBanner({ message: `${sale.documentNo} mock fiş olarak başlatıldı.`, tone: 'success' });
  };

  const addItem = () => {
    if (!documentNo) {
      setBanner({ message: 'Önce fişi başlat. Ürün ekleme fiş açıldıktan sonra yapılır.', tone: 'warning' });
      return;
    }
    setItemCount((current) => current + 1);
    setStep(3);
    setBanner({ message: 'Mock ürün eklendi. Ürün sayısı güncellendi.', tone: 'success' });
  };

  const createAlbum = () => {
    if (!documentNo) {
      setBanner({ message: 'QR albüm için önce fiş başlatılmalı.', tone: 'warning' });
      return;
    }
    setStep(4);
    setBanner({ message: `${documentNo} için QR albüm mock olarak hazırlandı.`, tone: 'success' });
  };

  return (
    <ScreenShell title="Yeni Fiş / Satış" subtitle="Adım adım mock fiş oluşturma" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <View style={styles.stepRow}>
        {steps.map((item, index) => {
          const active = step >= index + 1;
          return (
            <View key={item} style={[styles.stepPill, active && styles.activeStep]}>
              <Text style={[styles.stepText, active && styles.activeStepText]}>{index + 1}. {item}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.formPanel}>
        <Text style={styles.label}>1. Müşteri seç</Text>
        <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri etiketi yaz" placeholderTextColor={colors.muted} style={styles.input} />
        <AppButton label="2. Fiş Başlat" onPress={startSale} />
        <AppButton label="3. Ürün Ekle / Tara" onPress={addItem} variant="dark" />
        <AppButton label="4. QR Albüm Oluştur" onPress={createAlbum} variant="secondary" />
      </View>

      <InfoCard title="Fiş özeti" subtitle={documentNo || 'Henüz fiş başlatılmadı'}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Müşteri</Text>
          <Text style={styles.summaryValue}>{customer || 'Personel seçmedi'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ürün adedi</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
        <StatusPill label={documentNo ? 'Taslak' : 'Beklemede'} tone={documentNo ? 'warning' : 'info'} />
      </InfoCard>
      <InfoCard title="Fiyat alanı yok" subtitle="Bu terminal fiş hazırlığında fiyat gösterimi ve gerçek yazma işlemi bulunmaz." tone="warning" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stepPill: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeStep: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  stepText: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  activeStepText: { color: colors.surface },
  formPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { color: colors.muted, fontWeight: '800' },
  summaryValue: { color: colors.ink, fontWeight: '900' },
});
