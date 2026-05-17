import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { DEFAULT_EXCHANGE_RATES, SUPPORTED_CURRENCIES, calculateLineTotal, formatMoney, getEffectiveExchangeRates, normalizeCurrencyCode, normalizeSaleLineCurrency } from '../utils/currencyUtils';
import { createSaleMock, getMockProductByCode } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addAuditLog, loadActiveSaleDraft, loadSelectedSalesCustomer, saveActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, AppScreen, CurrencyCode, ExchangeRateSnapshot, Product, SaleLine, SaleStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type PendingProduct = Product & {
  time: string;
};

const parseQuantity = (value: string) => {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const makeSaleLine = (product: Product, quantity: number, saleCurrency: CurrencyCode, rates: ExchangeRateSnapshot, existingLine?: SaleLine): SaleLine => {
  const sourceCurrency = normalizeCurrencyCode(product.sourceCurrency || product.currency);
  const totals = calculateLineTotal(product.price, quantity, sourceCurrency, saleCurrency, rates);
  return {
    ...product,
    lineId: existingLine?.lineId || `${product.code}-${Date.now()}`,
    quantity,
    currency: sourceCurrency,
    price: totals.convertedUnitPrice,
    sourceCurrency,
    saleCurrency,
    exchangeRate: totals.exchangeRate,
    originalUnitPrice: totals.originalUnitPrice,
    convertedUnitPrice: totals.convertedUnitPrice,
    originalLineTotal: totals.originalLineTotal,
    convertedLineTotal: totals.convertedLineTotal,
  };
};

const repriceLines = (lines: SaleLine[], saleCurrency: CurrencyCode, rates: ExchangeRateSnapshot) => lines.map((line) => normalizeSaleLineCurrency(line, saleCurrency, rates));

export function NewSaleScreen({ onBack, onNavigate }: NewSaleScreenProps) {
  const insets = useSafeAreaInsets();
  const barcodeInputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);
  const bootstrappedRef = useRef(false);
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<CurrencyCode>('TRY');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateSnapshot>(DEFAULT_EXCHANGE_RATES);
  const [barcode, setBarcode] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [pendingDeleteLineId, setPendingDeleteLineId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalAmount = useMemo(() => lines.reduce((sum, line) => sum + (line.convertedLineTotal || line.quantity * line.price), 0), [lines]);
  const pendingQuantity = useMemo(() => parseQuantity(quantityInput), [quantityInput]);
  const pendingPrice = pendingProduct ? calculateLineTotal(pendingProduct.price, pendingQuantity, normalizeCurrencyCode(pendingProduct.sourceCurrency || pendingProduct.currency), saleCurrency, exchangeRates) : null;
  const status: SaleStatus = documentNo && lines.length > 0 ? 'Hazır' : 'Taslak';
  const canScan = Boolean(documentNo);

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadSelectedSalesCustomer(), getEffectiveExchangeRates()]).then(async ([draft, selectedSalesCustomer, effectiveRates]) => {
      if (bootstrappedRef.current) return;
      bootstrappedRef.current = true;
      setExchangeRates(effectiveRates);

      const hasActiveDraft = Boolean(draft && (draft.documentNo || draft.lines.length > 0));
      if (draft && hasActiveDraft) {
        const draftCurrency = normalizeCurrencyCode(draft.saleCurrency);
        setCustomer(draft.customerName);
        setDocumentNo(draft.documentNo);
        setSaleCurrency(draftCurrency);
        setLines(repriceLines(draft.lines, draftCurrency, effectiveRates));
        setBanner({ message: `${draft.documentNo} yüklendi.`, tone: 'info' });
        setTimeout(() => barcodeInputRef.current?.focus(), 150);
        return;
      }

      const nextCustomerName = draft?.customerName || selectedSalesCustomer?.name;
      if (!nextCustomerName) {
        setBanner({ message: 'Satış için müşteri seçimi gerekli.', tone: 'warning' });
        return;
      }

      const nextSaleCurrency = normalizeCurrencyCode(selectedSalesCustomer?.currency || draft?.saleCurrency);
      const sale = await createSaleMock(nextCustomerName);
      setCustomer(nextCustomerName);
      setDocumentNo(sale.documentNo);
      setSaleCurrency(nextSaleCurrency);
      await persistDraft([], sale.documentNo, nextCustomerName, nextSaleCurrency, effectiveRates);
      await addAuditLog({
        operationType: 'saleCurrency seçildi',
        customerName: nextCustomerName,
        documentNo: sale.documentNo,
        description: `Fiş para birimi ${nextSaleCurrency} olarak seçildi.`,
        status: 'success',
      });
      await addAuditLog({
        operationType: 'Yeni fiş oluşturuldu',
        customerName: nextCustomerName,
        documentNo: sale.documentNo,
        description: 'Mock satış fişi local taslak olarak hazırlandı.',
        status: 'success',
      });
      setBanner({ message: `${sale.documentNo} hazır.`, tone: 'success' });
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    });
  }, []);

  useEffect(() => {
    if (!documentNo) return undefined;
    const timer = setTimeout(() => barcodeInputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [documentNo]);

  const persistDraft = async (nextLines: SaleLine[] = lines, nextDocumentNo = documentNo, nextCustomer = customer, nextSaleCurrency = saleCurrency, rates = exchangeRates) => {
    if (!nextDocumentNo) return;
    const normalizedSaleCurrency = normalizeCurrencyCode(nextSaleCurrency);
    const draft: ActiveSaleDraft = {
      documentNo: nextDocumentNo,
      customerName: nextCustomer || 'Seçili müşteri yok',
      saleCurrency: normalizedSaleCurrency,
      exchangeRateSnapshot: rates,
      status: nextLines.length > 0 ? 'Hazır' : 'Taslak',
      lines: repriceLines(nextLines, normalizedSaleCurrency, rates),
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

  const selectSaleCurrency = async (nextCurrency: CurrencyCode) => {
    if (nextCurrency === saleCurrency) return;
    const previousCurrency = saleCurrency;
    const nextLines = repriceLines(lines, nextCurrency, exchangeRates);
    setSaleCurrency(nextCurrency);
    setLines(nextLines);
    await persistDraft(nextLines, documentNo, customer, nextCurrency, exchangeRates);
    await addAuditLog({
      operationType: previousCurrency ? 'saleCurrency değişti' : 'saleCurrency seçildi',
      customerName: customer,
      documentNo,
      description: `${previousCurrency} -> ${nextCurrency}`,
      status: 'warning',
    });
    setBanner({ message: `Fiş para birimi ${nextCurrency} olarak güncellendi.`, tone: 'info' });
    focusScanner();
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
        await addAuditLog({
          operationType: 'Ürün okutuldu',
          customerName: customer,
          documentNo,
          description: `${code} bulunamadı.`,
          status: 'warning',
        });
        setBanner({ message: `${code} bulunamadı.`, tone: 'warning' });
        notifyWarning();
        focusScanner();
        return;
      }

      const sourceCurrency = normalizeCurrencyCode(product.sourceCurrency || product.currency);
      setPendingProduct({ ...product, currency: sourceCurrency, sourceCurrency, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
      await addAuditLog({
        operationType: 'Ürün okutuldu',
        customerName: customer,
        documentNo,
        description: `${product.code} · ${product.name} · Kaynak ${formatMoney(product.price, sourceCurrency)}`,
        status: 'success',
      });
      setQuantityInput('1');
      setPendingDeleteLineId(null);
      setBanner({ message: `${product.code} bulundu.`, tone: 'success' });
      notifySuccess();
      focusQuantity();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün araması tamamlanamadı.';
      setBarcode('');
      setPendingProduct(null);
      await addAuditLog({
        operationType: 'Hata oluştu',
        customerName: customer,
        documentNo,
        description: message,
        status: 'error',
      });
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
      ? lines.map((line) => (line.lineId === existingLine.lineId ? makeSaleLine({ ...pendingProduct, price: line.originalUnitPrice || pendingProduct.price, currency: line.sourceCurrency || pendingProduct.currency }, line.quantity + quantity, saleCurrency, exchangeRates, line) : line))
      : [...lines, makeSaleLine(pendingProduct, quantity, saleCurrency, exchangeRates)];

    setLines(nextLines);
    setPendingProduct(null);
    setQuantityInput('1');
    await persistDraft(nextLines);
    await addAuditLog({
      operationType: 'Ürün fişe eklendi',
      customerName: customer,
      documentNo,
      description: `${pendingProduct.code} · ${quantity} adet · ${saleCurrency}`,
      status: 'success',
    });
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
    const nextLines = lines.map((line) => (line.lineId === lineId ? normalizeSaleLineCurrency({ ...line, quantity: Math.max(1, line.quantity + delta) }, saleCurrency, exchangeRates) : line));
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
    const removedLine = lines.find((line) => line.lineId === lineId);
    setLines(nextLines);
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    await addAuditLog({
      operationType: 'Ürün silindi',
      customerName: customer,
      documentNo,
      description: removedLine ? `${removedLine.code} · ${removedLine.name}` : 'Satır fişten silindi.',
      status: 'warning',
    });
    setBanner({ message: 'Satır silindi.', tone: 'info' });
    notifyWarning();
    focusScanner();
  };

  const reviewSale = async () => {
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

    const saleLines = repriceLines(lines, saleCurrency, exchangeRates);
    await persistDraft(saleLines, documentNo, customer, saleCurrency, exchangeRates);
    await addAuditLog({
      operationType: 'Fiş review açıldı',
      customerName: customer,
      documentNo,
      description: `${saleLines.length} kalem · ${totalQuantity} adet · ${formatMoney(totalAmount, saleCurrency)}`,
      status: 'success',
    });
    onNavigate('saleReview');
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

        <View style={styles.currencyPanel}>
          <Text style={styles.currencyLabel}>FİŞ PARA BİRİMİ</Text>
          <View style={styles.currencyButtons}>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <Pressable key={currency} onPress={() => void selectSaleCurrency(currency)} style={({ pressed }) => [styles.currencyButton, saleCurrency === currency && styles.currencyButtonActive, pressed && styles.pressed]}>
                <Text style={[styles.currencyButtonText, saleCurrency === currency && styles.currencyButtonTextActive]}>{currency}</Text>
              </Pressable>
            ))}
          </View>
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
              <Text style={styles.priceValue}>{pendingPrice ? formatMoney(pendingPrice.convertedUnitPrice, saleCurrency) : '-'}</Text>
              {pendingProduct && pendingPrice && pendingPrice.sourceCurrency !== saleCurrency ? <Text style={styles.sourcePriceText}>Kaynak: {formatMoney(pendingPrice.originalUnitPrice, pendingPrice.sourceCurrency)}</Text> : null}
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
              <Text style={styles.pendingTotalValue}>{pendingPrice ? formatMoney(pendingPrice.convertedLineTotal, saleCurrency) : '-'}</Text>
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
                  <Text style={[styles.lineMoney, styles.priceCol]} numberOfLines={1}>{formatMoney(line.convertedUnitPrice || line.price, saleCurrency)}</Text>
                  <Text style={[styles.lineMoneyStrong, styles.totalCol]} numberOfLines={1}>{formatMoney(line.convertedLineTotal || line.price * line.quantity, saleCurrency)}</Text>
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
          <Text style={styles.bottomAmount}>{formatMoney(totalAmount, saleCurrency)}</Text>
        </View>
        <AppButton label="FİŞİ TAMAMLA" onPress={reviewSale} variant="dark" compact />
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
  currencyPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  currencyLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  currencyButtons: { flexDirection: 'row', gap: spacing.xs },
  currencyButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderBottomWidth: 2, borderBottomColor: colors.red },
  currencyButtonText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  currencyButtonTextActive: { color: colors.surface },
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
  sourcePriceText: { color: colors.line, fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 2 },
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
  pressed: { opacity: 0.86 },
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
