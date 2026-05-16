import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { createSaleMock, getMockProductByCode } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addSalePrintJob, loadActiveSaleDraft, loadSelectedSalesCustomer, saveActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, Product, SaleLine, SalePrintJob, SaleStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

type PendingProduct = Product & {
  time: string;
};

const formatPrice = (price: number, currency = 'TL') => `${price.toLocaleString('tr-TR')} ${currency}`;
const parseQuantity = (value: string) => {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const getPrimaryCurrency = (lines: SaleLine[]) => lines.find((line) => line.currency)?.currency || 'TL';

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const insets = useSafeAreaInsets();
  const barcodeInputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);
  const bootstrappedRef = useRef(false);
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [pendingDeleteLineId, setPendingDeleteLineId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalAmount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.price, 0), [lines]);
  const pendingQuantity = useMemo(() => parseQuantity(quantityInput), [quantityInput]);
  const pendingTotal = pendingProduct ? pendingProduct.price * pendingQuantity : 0;
  const status: SaleStatus = documentNo && lines.length > 0 ? 'Hazır' : 'Taslak';
  const canScan = Boolean(documentNo);

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadSelectedSalesCustomer()]).then(async ([draft, selectedSalesCustomer]) => {
      if (bootstrappedRef.current) return;
      bootstrappedRef.current = true;

      const hasActiveDraft = Boolean(draft && (draft.documentNo || draft.lines.length > 0));
      if (draft && hasActiveDraft) {
        setCustomer(draft.customerName);
        setDocumentNo(draft.documentNo);
        setLines(draft.lines);
        setBanner({ message: `${draft.documentNo} yüklendi.`, tone: 'info' });
        setTimeout(() => barcodeInputRef.current?.focus(), 150);
        return;
      }

      const nextCustomerName = draft?.customerName || selectedSalesCustomer?.name;
      if (!nextCustomerName) {
        setBanner({ message: 'Satış için müşteri seçimi gerekli.', tone: 'warning' });
        return;
      }

      const sale = await createSaleMock(nextCustomerName);
      setCustomer(nextCustomerName);
      setDocumentNo(sale.documentNo);
      await persistDraft([], sale.documentNo, nextCustomerName);
      setBanner({ message: `${sale.documentNo} hazır.`, tone: 'success' });
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    });
  }, []);

  useEffect(() => {
    if (!documentNo) return undefined;
    const timer = setTimeout(() => barcodeInputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [documentNo]);

  const persistDraft = async (nextLines: SaleLine[] = lines, nextDocumentNo = documentNo, nextCustomer = customer) => {
    if (!nextDocumentNo) return;
    const draft: ActiveSaleDraft = {
      documentNo: nextDocumentNo,
      customerName: nextCustomer || 'Seçili müşteri yok',
      status: nextLines.length > 0 ? 'Hazır' : 'Taslak',
      lines: nextLines,
      updatedAt: new Date().toISOString(),
    };
    await saveActiveSaleDraft(draft);
  };

  const focusScanner = () => {
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  const focusQuantity = () => {
    setTimeout(() => quantityInputRef.current?.focus(), 80);
  };

  const scanProduct = async (rawCode?: string) => {
    if (!documentNo) {
      setBanner({ message: 'Fiş hazırlanıyor. Müşteri seçimini kontrol et.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const code = (rawCode ?? barcode).trim().toUpperCase();
    if (!code) {
      setBanner({ message: 'Barkod gir.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const now = Date.now();
    if (lastScanRef.current?.code === code && now - lastScanRef.current.time < 500) {
      setBarcode('');
      setBanner({ message: 'Tekrarlı okutma engellendi.', tone: 'info' });
      notifyWarning();
      focusScanner();
      return;
    }
    lastScanRef.current = { code, time: now };

    try {
      const product = await getMockProductByCode(code);
      setBarcode('');
      if (!product) {
        setPendingProduct(null);
        setBanner({ message: `${code} bulunamadı.`, tone: 'warning' });
        notifyWarning();
        focusScanner();
        return;
      }

      setPendingProduct({ ...product, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
      setQuantityInput('1');
      setPendingDeleteLineId(null);
      setBanner({ message: `${product.code} bulundu.`, tone: 'success' });
      notifySuccess();
      focusQuantity();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün araması tamamlanamadı.';
      setBarcode('');
      setPendingProduct(null);
      setBanner({ message, tone: 'warning' });
      notifyWarning();
      focusScanner();
    }
  };

  const addPendingProduct = async () => {
    if (!pendingProduct) {
      await scanProduct();
      return;
    }

    const quantity = parseQuantity(quantityInput);
    const existingLine = lines.find((line) => line.code === pendingProduct.code);
    const nextLines = existingLine
      ? lines.map((line) => (line.lineId === existingLine.lineId ? { ...line, quantity: line.quantity + quantity, price: pendingProduct.price, currency: pendingProduct.currency } : line))
      : [...lines, { ...pendingProduct, lineId: `${pendingProduct.code}-${Date.now()}`, quantity }];

    setLines(nextLines);
    setPendingProduct(null);
    setQuantityInput('1');
    await persistDraft(nextLines);
    setBanner({ message: `${pendingProduct.code} fişe eklendi.`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  const handleBarcodeChange = (value: string) => {
    if (value.includes('\n') || value.includes('\r')) {
      const scannedCode = value.replace(/[\r\n]/g, '').trim();
      setBarcode(scannedCode);
      void scanProduct(scannedCode);
      return;
    }
    setBarcode(value);
  };

  const changePendingQuantity = (delta: number) => {
    const nextQuantity = Math.max(1, pendingQuantity + delta);
    setQuantityInput(String(nextQuantity));
    focusQuantity();
  };

  const changeQuantity = async (lineId: string, delta: number) => {
    const nextLines = lines.map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
    setLines(nextLines);
    await persistDraft(nextLines);
    focusScanner();
  };

  const removeLine = async (lineId: string) => {
    if (pendingDeleteLineId !== lineId) {
      setPendingDeleteLineId(lineId);
      setBanner({ message: 'Silmek için tekrar bas.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const nextLines = lines.filter((line) => line.lineId !== lineId);
    setLines(nextLines);
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    setBanner({ message: 'Satır silindi.', tone: 'info' });
    notifyWarning();
    focusScanner();
  };

  const completeSale = async () => {
    if (!documentNo) {
      setBanner({ message: 'Tamamlamak için fiş gerekli.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    if (lines.length === 0) {
      setBanner({ message: 'Tamamlamak için ürün ekle.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    await persistDraft();
    const currency = getPrimaryCurrency(lines);
    const printJob: SalePrintJob = {
      id: `${documentNo}-${Date.now()}`,
      documentNo,
      customerName: customer || 'Seçili müşteri yok',
      lineCount: lines.length,
      totalQuantity,
      totalAmount,
      currency,
      status: 'Yazdırma bekliyor',
      createdAt: new Date().toISOString(),
    };
    await addSalePrintJob(printJob);
    setBanner({ message: `${documentNo} yazdırma kuyruğuna alındı. ${lines.length} kalem · ${totalQuantity} adet · ${formatPrice(totalAmount, currency)}`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  return (
    <View style={styles.shell}>
      <TerminalHeader onBack={onBack} />
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 86 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topPanel}>
          <View style={styles.topMain}>
            <Text style={styles.documentNo}>{documentNo || 'Fiş hazırlanıyor'}</Text>
            <Text style={styles.customerName} numberOfLines={1}>{customer || 'Müşteri seçilmedi'}</Text>
          </View>
          <StatusPill label={status} tone={status === 'Hazır' ? 'success' : 'warning'} />
        </View>

        <View style={styles.scanPanel}>
          <TextInput
            ref={barcodeInputRef}
            value={barcode}
            onChangeText={handleBarcodeChange}
            placeholder={canScan ? 'BARKOD' : 'MÜŞTERİ SEÇ'}
            placeholderTextColor={colors.muted}
            style={[styles.barcodeInput, !canScan && styles.disabledInput]}
            autoCapitalize="characters"
            editable={canScan}
            blurOnSubmit={false}
            returnKeyType="done"
            onSubmitEditing={() => scanProduct()}
          />

          <View style={styles.productReadout}>
            <View style={styles.productReadoutMain}>
              <Text style={styles.pendingCode}>{pendingProduct?.code || '-'}</Text>
              <Text style={styles.pendingName} numberOfLines={2}>{pendingProduct?.name || 'Ürün okutulmadı'}</Text>
              <Text style={styles.pendingTime}>{pendingProduct ? pendingProduct.time : ''}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>FİYAT</Text>
              <Text style={styles.priceValue}>{pendingProduct ? formatPrice(pendingProduct.price, pendingProduct.currency) : '-'}</Text>
            </View>
          </View>

          <View style={styles.quantityRow}>
            <Pressable onPress={() => changePendingQuantity(-1)} style={styles.quantityButton}>
              <Text style={styles.quantityButtonText}>-</Text>
            </Pressable>
            <TextInput
              ref={quantityInputRef}
              value={quantityInput}
              onChangeText={setQuantityInput}
              keyboardType="number-pad"
              selectTextOnFocus
              style={styles.quantityInput}
            />
            <Pressable onPress={() => changePendingQuantity(1)} style={styles.quantityButton}>
              <Text style={styles.quantityButtonText}>+</Text>
            </Pressable>
            <View style={styles.pendingTotalBox}>
              <Text style={styles.pendingTotalLabel}>TOPLAM</Text>
              <Text style={styles.pendingTotalValue}>{pendingProduct ? formatPrice(pendingTotal, pendingProduct.currency) : '-'}</Text>
            </View>
          </View>

          <AppButton label="FİŞE EKLE" onPress={addPendingProduct} variant="primary" />
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.codeCol]}>KOD</Text>
            <Text style={[styles.headerCell, styles.qtyCol]}>ADET</Text>
            <Text style={[styles.headerCell, styles.priceCol]}>FİYAT</Text>
            <Text style={[styles.headerCell, styles.totalCol]}>TOPLAM</Text>
          </View>
          <ScrollView style={styles.tableBody} nestedScrollEnabled>
            {lines.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Satır yok</Text>
              </View>
            ) : (
              lines.map((line) => (
                <View key={line.lineId} style={styles.lineRow}>
                  <Pressable onPress={() => removeLine(line.lineId)} style={styles.codeCol}>
                    <Text style={styles.lineCode} numberOfLines={1}>{line.code}</Text>
                    <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
                    {pendingDeleteLineId === line.lineId ? <Text style={styles.deleteHint}>Silmek için tekrar bas</Text> : null}
                  </Pressable>
                  <View style={styles.qtyCol}>
                    <View style={styles.lineQtyControls}>
                      <Pressable onPress={() => changeQuantity(line.lineId, -1)} style={styles.lineQtyButton}>
                        <Text style={styles.lineQtyButtonText}>-</Text>
                      </Pressable>
                      <Text style={styles.lineQtyValue}>{line.quantity}</Text>
                      <Pressable onPress={() => changeQuantity(line.lineId, 1)} style={styles.lineQtyButton}>
                        <Text style={styles.lineQtyButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={[styles.lineMoney, styles.priceCol]} numberOfLines={1}>{formatPrice(line.price, line.currency)}</Text>
                  <Text style={[styles.lineMoneyStrong, styles.totalCol]} numberOfLines={1}>{formatPrice(line.price * line.quantity, line.currency)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.bottomTotals}>
          <Text style={styles.bottomText}>Kalem {lines.length}</Text>
          <Text style={styles.bottomText}>Adet {totalQuantity}</Text>
          <Text style={styles.bottomAmount}>{formatPrice(totalAmount)}</Text>
        </View>
        <AppButton label="YAZDIRMAYA GÖNDER" onPress={completeSale} variant="dark" compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { padding: spacing.sm, gap: spacing.sm },
  topPanel: {
    minHeight: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topMain: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  scanPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.anthracite,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  barcodeInput: {
    minHeight: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.anthracite,
    color: colors.ink,
    fontSize: 24,
    paddingHorizontal: spacing.md,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  disabledInput: { opacity: 0.7 },
  productReadout: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  productReadoutMain: {
    flex: 1,
    minHeight: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  pendingCode: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  pendingName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  pendingTime: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  priceBlock: {
    width: 108,
    borderRadius: radius.md,
    backgroundColor: colors.anthracite,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceLabel: { color: colors.line, fontSize: typography.small, fontWeight: '900' },
  priceValue: { color: colors.surface, fontSize: typography.body, fontWeight: '900', textAlign: 'center' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { color: colors.surface, fontSize: 24, fontWeight: '900' },
  quantityInput: {
    width: 62,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surfaceSoft,
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  pendingTotalBox: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pendingTotalLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  pendingTotalValue: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  table: {
    flex: 1,
    minHeight: 190,
    maxHeight: 390,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tableHeader: {
    minHeight: 24,
    backgroundColor: colors.anthracite,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tableBody: { maxHeight: 366 },
  headerCell: { color: colors.surface, fontSize: 10, fontWeight: '900' },
  codeCol: { flex: 1, minWidth: 0, paddingHorizontal: 3 },
  qtyCol: { width: 74, alignItems: 'center' },
  priceCol: { width: 68, textAlign: 'right', paddingHorizontal: 2 },
  totalCol: { width: 76, textAlign: 'right', paddingHorizontal: 2 },
  emptyRow: { minHeight: 34, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lineRow: {
    minHeight: 33,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  lineCode: { color: colors.red, fontSize: 10, fontWeight: '900', lineHeight: 12 },
  lineName: { color: colors.ink, fontSize: 9, fontWeight: '800', lineHeight: 11 },
  deleteHint: { color: colors.red, fontSize: 8, fontWeight: '900', lineHeight: 9 },
  lineQtyControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  lineQtyButton: {
    width: 21,
    height: 21,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineQtyButtonText: { color: colors.anthracite, fontSize: 12, fontWeight: '900', lineHeight: 14 },
  lineQtyValue: { width: 24, color: colors.ink, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  lineMoney: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  lineMoneyStrong: { color: colors.anthracite, fontSize: 10, fontWeight: '900' },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomTotals: { flex: 1, gap: 1 },
  bottomText: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  bottomAmount: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
});
