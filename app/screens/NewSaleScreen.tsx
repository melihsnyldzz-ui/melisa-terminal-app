import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { createSaleMock, getMockProductByCode } from '../../services/api';
import { loadActiveSaleDraft, saveActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, SaleLine, SaleStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

const steps = ['Müşteri', 'Fiş', 'Ürün', 'QR'];

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [step, setStep] = useState(1);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const status: SaleStatus = documentNo && lines.length > 0 ? 'Hazır' : 'Taslak';

  useEffect(() => {
    loadActiveSaleDraft().then((draft) => {
      if (!draft) return;
      setCustomer(draft.customerName);
      setDocumentNo(draft.documentNo);
      setLines(draft.lines);
      setStep(draft.lines.length > 0 ? 3 : 2);
      setBanner({ message: `${draft.documentNo} local taslak olarak yüklendi.`, tone: 'info' });
    });
  }, []);

  const persistDraft = async (nextLines: SaleLine[], nextDocumentNo = documentNo, nextCustomer = customer) => {
    if (!nextDocumentNo) return;
    const draft: ActiveSaleDraft = {
      documentNo: nextDocumentNo,
      customerName: nextCustomer || 'Personel seçmedi',
      status: nextLines.length > 0 ? 'Hazır' : 'Taslak',
      lines: nextLines,
      updatedAt: new Date().toISOString(),
    };
    await saveActiveSaleDraft(draft);
  };

  const startSale = async () => {
    const sale = await createSaleMock(customer);
    setDocumentNo(sale.documentNo);
    setStep(2);
    await persistDraft(lines, sale.documentNo, customer);
    setBanner({ message: `${sale.documentNo} aktif fiş taslağı olarak kaydedildi.`, tone: 'success' });
  };

  const addProduct = async (rawCode?: string) => {
    if (!documentNo) {
      setBanner({ message: 'Önce fişi başlat. Ürün ekleme fiş açıldıktan sonra yapılır.', tone: 'warning' });
      return;
    }
    const code = (rawCode ?? barcode).trim();
    if (!code) {
      setBanner({ message: 'Barkod / QR kod alanı boş. Kod yazıp Ekle tuşuna bas.', tone: 'warning' });
      return;
    }
    const product = await getMockProductByCode(code);
    const nextLines = [...lines, { ...product, lineId: `${product.code}-${Date.now()}`, quantity: 1 }];
    setLines(nextLines);
    setBarcode('');
    setStep(3);
    await persistDraft(nextLines);
    setBanner({ message: `${product.code} ürünü fişe eklendi.`, tone: 'success' });
  };

  const changeQuantity = async (lineId: string, delta: number) => {
    const nextLines = lines
      .map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line))
      .filter((line) => line.quantity > 0);
    setLines(nextLines);
    await persistDraft(nextLines);
  };

  const removeLine = async (lineId: string) => {
    const nextLines = lines.filter((line) => line.lineId !== lineId);
    setLines(nextLines);
    await persistDraft(nextLines);
    setBanner({ message: 'Ürün satırı fişten silindi.', tone: 'info' });
  };

  const createAlbum = () => {
    if (!documentNo) {
      setBanner({ message: 'QR albüm için önce fiş başlatılmalı.', tone: 'warning' });
      return;
    }
    setStep(4);
    setBanner({ message: `${documentNo} için QR albüm hazırlandı.`, tone: 'success' });
  };

  return (
    <ScreenShell title="Yeni Fiş / Satış" subtitle="Aktif fiş ve barkod akışı" onBack={onBack}>
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
        <Text style={styles.label}>Müşteri</Text>
        <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri etiketi yaz" placeholderTextColor={colors.muted} style={styles.input} />
        <AppButton label="Fiş Başlat" onPress={startSale} />
        <Text style={styles.label}>Barkod / QR kod gir</Text>
        <TextInput value={barcode} onChangeText={setBarcode} placeholder="Örn: MB-ELB-104" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="characters" />
        <ActionRow actions={[{ label: 'Ekle', onPress: () => addProduct(), variant: 'primary' }, { label: 'Hızlı Ekle', onPress: () => addProduct(`MB-${Date.now().toString().slice(-4)}`), variant: 'dark' }]} />
        <AppButton label="QR Albüm Oluştur" onPress={createAlbum} variant="secondary" compact />
      </View>

      <InfoCard title="Fiş özeti" subtitle={documentNo || 'Henüz fiş başlatılmadı'}>
        <SummaryRow label="Müşteri" value={customer || 'Personel seçmedi'} />
        <SummaryRow label="Ürün kalem sayısı" value={lines.length.toString()} />
        <SummaryRow label="Toplam adet" value={totalQuantity.toString()} />
        <StatusPill label={status} tone={status === 'Hazır' ? 'success' : 'warning'} />
      </InfoCard>

      {lines.length === 0 ? (
        <EmptyState badge="ÜRÜN" title="Fişte ürün yok" description="Barkod / QR kod alanına örnek kod yazıp Ekle tuşuna bas." />
      ) : (
        <View style={styles.productList}>
          {lines.map((line) => (
            <View key={line.lineId} style={styles.productRow}>
              <View style={styles.productMain}>
                <Text style={styles.productCode}>{line.code}</Text>
                <Text style={styles.productName}>{line.name}</Text>
                <Text style={styles.productMeta}>{line.color} · {line.size} · Adet {line.quantity}</Text>
              </View>
              <ActionRow actions={[{ label: '-', onPress: () => changeQuantity(line.lineId, -1), variant: 'quiet' }, { label: '+', onPress: () => changeQuantity(line.lineId, 1), variant: 'secondary' }, { label: 'Sil', onPress: () => removeLine(line.lineId), variant: 'primary' }]} />
            </View>
          ))}
        </View>
      )}

      <InfoCard title="Fiyat alanı yok" subtitle="Bu terminal fiş hazırlığında fiyat gösterimi ve gerçek yazma işlemi bulunmaz." tone="warning" />
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
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stepPill: { borderRadius: radius.md, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  activeStep: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  stepText: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  activeStepText: { color: colors.surface },
  formPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: typography.body, paddingHorizontal: spacing.md, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { color: colors.muted, fontWeight: '800' },
  summaryValue: { color: colors.ink, fontWeight: '900' },
  productList: { gap: spacing.sm },
  productRow: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md, gap: spacing.sm },
  productMain: { gap: 2 },
  productCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
});
