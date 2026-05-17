import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { addAuditLog, saveActiveSaleDraft, saveSelectedSalesCustomer } from '../../storage/localStorage';
import type { AppScreen, SalesCustomer } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type SalesCustomerScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

const mockCustomers: SalesCustomer[] = [
  { id: 'cus-1', name: 'ABC Baby Store', code: 'C-1001', city: 'İstanbul', currency: 'TRY', balanceLabel: 'Bakiye 12.450 TRY', lastOperationLabel: 'Son fiş: Bugün 10:24' },
  { id: 'cus-2', name: 'Mini Kids', code: 'C-1002', city: 'İstanbul', currency: 'USD', balanceLabel: 'Bakiye 4.180 TRY', lastOperationLabel: 'Son fiş: Dün' },
  { id: 'cus-3', name: 'Nova Baby', code: 'C-1003', city: 'Ankara', currency: 'EUR', balanceLabel: 'Bakiye 0 TRY', lastOperationLabel: 'Son fiş: 2 gün önce' },
  { id: 'cus-4', name: 'Melisa Baby Boutique', code: 'C-1004', city: 'İzmir', currency: 'TRY', balanceLabel: 'Bakiye 8.920 TRY', lastOperationLabel: 'Son fiş: Bu hafta' },
  { id: 'cus-5', name: 'Bebek Dünyası', code: 'C-1005', city: 'Bursa', currency: 'TRY', balanceLabel: 'Bakiye 1.340 TRY', lastOperationLabel: 'Son fiş: 12 Mayıs' },
  { id: 'cus-6', name: 'Happy Mini Store', code: 'C-1006', city: 'Antalya', currency: 'USD', balanceLabel: 'Bakiye 6.700 TRY', lastOperationLabel: 'Son fiş: 8 Mayıs' },
  { id: 'cus-7', name: 'Luna Kids Wear', code: 'C-1007', city: 'Gaziantep', currency: 'EUR', balanceLabel: 'Bakiye 2.215 TRY', lastOperationLabel: 'Son fiş: Nisan' },
];

const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export function SalesCustomerScreen({ onBack, onNavigate }: SalesCustomerScreenProps) {
  const [query, setQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SalesCustomer | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const normalizedQuery = normalizeSearchText(query);
  const customers = useMemo(() => {
    if (!normalizedQuery) return mockCustomers;
    return mockCustomers
      .filter((customer) => {
        const searchArea = `${customer.name} ${customer.code} ${customer.city}`;
        return normalizeSearchText(searchArea).includes(normalizedQuery);
      })
      .sort((first, second) => normalizeSearchText(first.name).localeCompare(normalizeSearchText(second.name), 'tr-TR'));
  }, [normalizedQuery]);

  const selectCustomer = async (customer: SalesCustomer) => {
    setSelectedCustomer(customer);
    await saveSelectedSalesCustomer(customer);
    await addAuditLog({
      operationType: 'Müşteri seçildi',
      customerName: customer.name,
      description: `${customer.code} · ${customer.city}`,
      status: 'success',
    });
    setBanner({ message: `${customer.name} satış müşterisi olarak seçildi.`, tone: 'success' });
  };

  const startNewSale = async () => {
    if (!selectedCustomer) {
      setBanner({ message: 'Önce müşteri seç.', tone: 'warning' });
      return;
    }

    await saveSelectedSalesCustomer(selectedCustomer);
    await saveActiveSaleDraft({
      documentNo: '',
      customerName: selectedCustomer.name,
      saleCurrency: selectedCustomer.currency || 'TRY',
      status: 'Taslak',
      lines: [],
      updatedAt: new Date().toISOString(),
    });
    onNavigate('newSale');
  };

  const openDocuments = async () => {
    if (selectedCustomer) await saveSelectedSalesCustomer(selectedCustomer);
    onNavigate('openSaleDrafts');
  };

  const showComingSoon = (label: string) => {
    if (!selectedCustomer) {
      setBanner({ message: 'Önce müşteri seç.', tone: 'warning' });
      return;
    }
    setBanner({ message: `${selectedCustomer.name} için ${label} mock aşamada.`, tone: 'info' });
  };

  return (
    <ScreenShell title="SATIŞ" subtitle="Müşteri seç, satış operasyonunu başlat" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.searchPanel}>
        <Text style={styles.label}>Müşteri ara</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Müşteri adı, kodu veya şehir yaz"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.customerList}>
        {customers.length > 0 ? (
          customers.map((customer) => {
            const selected = selectedCustomer?.id === customer.id;
            return (
              <Pressable key={customer.id} onPress={() => selectCustomer(customer)} style={({ pressed }) => [styles.customerRow, selected && styles.customerRowSelected, pressed && styles.pressed]}>
                <View style={styles.customerMain}>
                  <Text style={[styles.customerName, selected && styles.customerNameSelected]} numberOfLines={1}>{customer.name}</Text>
                  <Text style={[styles.customerMeta, selected && styles.customerMetaSelected]}>{customer.code} · {customer.city}</Text>
                  <Text style={[styles.customerSubMeta, selected && styles.customerMetaSelected]}>{customer.lastOperationLabel}</Text>
                </View>
                <View style={styles.customerSide}>
                  <StatusPill label={selected ? 'Seçili' : 'Seç'} tone={selected ? 'success' : 'info'} />
                  <Text style={[styles.balanceText, selected && styles.customerMetaSelected]}>{customer.balanceLabel}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <EmptyState badge="CRM" title="Müşteri bulunamadı" description="İsim, kod veya şehirle tekrar ara." />
        )}
      </View>

      {selectedCustomer ? (
        <View style={styles.operationPanel}>
          <View style={styles.operationHeader}>
            <View style={styles.operationHeaderText}>
              <Text style={styles.operationKicker}>MÜŞTERİ OPERASYONU</Text>
              <Text style={styles.operationTitle} numberOfLines={1}>{selectedCustomer.name}</Text>
            </View>
            <StatusPill label={selectedCustomer.code} tone="success" />
          </View>
          <AppButton label="Yeni Fiş" onPress={startNewSale} variant="primary" />
          <ActionRow
            actions={[
              { label: 'Açık Fişler', onPress: () => void openDocuments(), variant: 'secondary' },
              { label: 'Müşteri Raporları', onPress: () => showComingSoon('Müşteri Raporları'), variant: 'quiet' },
              { label: 'Geçmiş İşlemler', onPress: () => showComingSoon('Geçmiş İşlemler'), variant: 'dark' },
            ]}
          />
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '800',
  },
  customerList: { gap: spacing.xs },
  customerRow: {
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.anthracite,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customerRowSelected: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderLeftColor: colors.red },
  customerMain: { flex: 1, gap: 2 },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  customerNameSelected: { color: colors.surface },
  customerMeta: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  customerSubMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  customerMetaSelected: { color: colors.surface },
  customerSide: { minWidth: 94, alignItems: 'flex-end', gap: spacing.xs },
  balanceText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', textAlign: 'right' },
  operationPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red,
    borderTopWidth: 3,
    borderTopColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  operationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  operationHeaderText: { flex: 1, gap: 2 },
  operationKicker: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  operationTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
