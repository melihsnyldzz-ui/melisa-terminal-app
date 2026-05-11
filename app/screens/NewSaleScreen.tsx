import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { createSaleMock, getMockProductByCode } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { loadActiveSaleDraft, saveActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, SaleLine, SaleStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

const quickCustomers = ['ABC Baby Store', 'Mini Kids', 'Nova Baby', 'Yeni Müşteri'];
const quickCodes = ['MB-1001', 'MB-1002', 'MB-1003'];

type LastScannedProduct = {
  code: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  time: string;
};

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const barcodeInputRef = useRef<TextInput>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [lastScanned, setLastScanned] = useState<LastScannedProduct | null>(null);
  const [pendingDeleteLineId, setPendingDeleteLineId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const status: SaleStatus = documentNo && lines.length > 0 ? 'Hazır' : 'Taslak';
  const canScan = Boolean(documentNo);

  useEffect(() => {
    loadActiveSaleDraft().then((draft) => {
      if (!draft) return;
      setCustomer(draft.customerName);
      setDocumentNo(draft.documentNo);
      setLines(draft.lines);
      setBanner({ message: `${draft.documentNo} taslak yüklendi.`, tone: 'info' });
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    });
  }, []);

  useEffect(() => {
    if (!documentNo) return;
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

  const selectCustomer = (nextCustomer: string) => {
    setCustomer(nextCustomer === 'Yeni Müşteri' ? '' : nextCustomer);
  };

  const focusScanner = () => {
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  const startSale = async () => {
    if (documentNo) {
      setBanner({ message: 'Fiş zaten aktif.', tone: 'info' });
      focusScanner();
      return;
    }

    const selectedCustomer = customer.trim();
    if (!selectedCustomer) {
      setBanner({ message: 'Önce müşteri seç.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const sale = await createSaleMock(selectedCustomer);
    setDocumentNo(sale.documentNo);
    await persistDraft(lines, sale.documentNo, selectedCustomer);
    setBanner({ message: `${sale.documentNo} aktif fiş hazır.`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  const addProduct = async (rawCode?: string) => {
    if (!documentNo) {
      setBanner({ message: 'Önce fişi başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    const code = (rawCode ?? barcode).trim().toUpperCase();
    if (!code) {
      setBanner({ message: 'Kod okut ya da yaz.', tone: 'warning' });
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

    const product = await getMockProductByCode(code);
    const existingLine = lines.find((line) => line.code === product.code);
    const nextLines = existingLine
      ? lines.map((line) => (line.lineId === existingLine.lineId ? { ...line, quantity: line.quantity + 1 } : line))
      : [...lines, { ...product, lineId: `${product.code}-${Date.now()}`, quantity: 1 }];

    setLines(nextLines);
    setBarcode('');
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    const nextQuantity = nextLines.find((line) => line.code === product.code)?.quantity ?? 1;
    setLastScanned({
      code: product.code,
      name: product.name,
      color: product.color,
      size: product.size,
      quantity: nextQuantity,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    });
    setBanner({ message: `${product.code} fişe eklendi.`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  const handleBarcodeChange = (value: string) => {
    if (value.includes('\n') || value.includes('\r')) {
      const scannedCode = value.replace(/[\r\n]/g, '').trim();
      setBarcode(scannedCode);
      void addProduct(scannedCode);
      return;
    }
    setBarcode(value);
  };

  const changeQuantity = async (lineId: string, delta: number) => {
    const nextLines = lines
      .map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
    setLines(nextLines);
    await persistDraft(nextLines);
    focusScanner();
  };

  const removeLine = async (lineId: string) => {
    if (pendingDeleteLineId !== lineId) {
      setPendingDeleteLineId(lineId);
      setBanner({ message: 'Silmek için tekrar basın.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const nextLines = lines.filter((line) => line.lineId !== lineId);
    setLines(nextLines);
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    setBanner({ message: 'Ürün satırı silindi.', tone: 'info' });
    notifyWarning();
    focusScanner();
  };

  const saveDraft = async () => {
    if (!documentNo) {
      setBanner({ message: 'Kaydetmek için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'Taslak kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  const prepareAlbum = async () => {
    if (!documentNo) {
      setBanner({ message: 'QR albüm için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    if (lines.length === 0) {
      setBanner({ message: 'QR albüm için ürün ekle.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'QR albüm hazırlandı.', tone: 'success' });
    notifySuccess();
  };

  const holdSale = async () => {
    if (!documentNo) {
      setBanner({ message: 'Beklemeye almak için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'Fiş beklemeye alındı.', tone: 'info' });
  };

  const completeSale = async () => {
    if (!documentNo) {
      setBanner({ message: 'Tamamlamak için fiş başlat.', tone: 'warning' });
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
    setBanner({ message: 'Fiş hazırlandı.', tone: 'success' });
    notifySuccess();
  };

  return (
    <ScreenShell title="Yeni Fiş" subtitle="Hızlı satış akışı" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.statusPanel}>
        <View style={styles.statusTopRow}>
          <Text style={styles.statusDocument}>{documentNo || 'Fiş başlatılmadı'}</Text>
          <StatusPill label={status} tone={status === 'Hazır' ? 'success' : 'warning'} />
        </View>
        <Text style={styles.statusCustomer} numberOfLines={1}>{customer || 'Müşteri seçilmedi'}</Text>
        <View style={styles.statusMetricRow}>
          <Metric label="Kalem" value={lines.length.toString()} />
          <Metric label="Toplam" value={totalQuantity.toString()} />
          <Metric label="Okutma" value={canScan ? 'Hazır' : 'Kapalı'} />
        </View>
      </View>

      <View style={styles.formPanel}>
        <Text style={styles.label}>Müşteri</Text>
        <View style={styles.customerGrid}>
          {quickCustomers.map((item) => {
            const selected = customer === item;
            return (
              <Pressable key={item} onPress={() => selectCustomer(item)} style={[styles.customerChip, selected && styles.customerChipSelected]}>
                <Text style={[styles.customerChipText, selected && styles.customerChipTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri etiketi" placeholderTextColor={colors.muted} style={styles.input} />
        <AppButton label={documentNo ? 'Fiş Başlatıldı' : 'Fiş Başlat'} onPress={startSale} variant={documentNo ? 'dark' : 'primary'} />

        <Text style={styles.label}>Barkod / QR</Text>
        <TextInput
          ref={barcodeInputRef}
          value={barcode}
          onChangeText={handleBarcodeChange}
          placeholder={canScan ? 'Kod okut veya yaz' : 'Önce fiş başlat'}
          placeholderTextColor={colors.muted}
          style={[styles.input, canScan && styles.scanInput, !canScan && styles.disabledInput]}
          autoCapitalize="characters"
          editable={canScan}
          blurOnSubmit={false}
          returnKeyType="done"
          onSubmitEditing={() => addProduct()}
        />
        <View style={styles.lastScanBox}>
          <Text style={styles.lastScanLabel}>Son okutulan</Text>
          {lastScanned ? (
            <View style={styles.lastScanBody}>
              <Text style={styles.lastScanCode}>{lastScanned.code}</Text>
              <Text style={styles.lastScanName} numberOfLines={1}>{lastScanned.name}</Text>
              <Text style={styles.lastScanMeta}>{lastScanned.color} · {lastScanned.size}</Text>
              <Text style={styles.lastScanMeta}>Adet {lastScanned.quantity} · {lastScanned.time}</Text>
            </View>
          ) : (
            <Text style={styles.lastScanEmpty}>Henüz ürün okutulmadı.</Text>
          )}
        </View>
        <ActionRow
          actions={[
            { label: 'Ekle', onPress: () => addProduct(), variant: 'primary' },
          ]}
        />
        <View style={styles.quickCodeRow}>
          {quickCodes.map((code) => (
            <Pressable key={code} onPress={() => addProduct(code)} style={styles.quickCodeButton}>
              <Text style={styles.quickCodeText}>{code}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {lines.length === 0 ? (
        <EmptyState badge="ÜRÜN" title="Fişte ürün yok" description="Kod okut ya da hızlı kod seç." />
      ) : (
        <View style={styles.productList}>
          {lines.map((line) => (
            <View key={line.lineId} style={styles.productRow}>
              <View style={styles.productMain}>
                <Text style={styles.productCode}>{line.code}</Text>
                <Text style={styles.productName}>{line.name}</Text>
                <Text style={styles.productMeta}>{line.color} · {line.size}</Text>
              </View>
              <View style={styles.quantityBlock}>
                <Text style={styles.quantityLabel}>Adet</Text>
                <Text style={styles.quantityValue}>{line.quantity}</Text>
              </View>
              <View style={styles.lineActions}>
                <Pressable onPress={() => changeQuantity(line.lineId, -1)} style={styles.lineButton}>
                  <Text style={styles.lineButtonText}>-</Text>
                </Pressable>
                <Pressable onPress={() => changeQuantity(line.lineId, 1)} style={styles.lineButton}>
                  <Text style={styles.lineButtonText}>+</Text>
                </Pressable>
                <Pressable onPress={() => removeLine(line.lineId)} style={[styles.lineButton, styles.deleteButton, pendingDeleteLineId === line.lineId && styles.deleteConfirmButton]}>
                  <Text style={styles.deleteText}>{pendingDeleteLineId === line.lineId ? 'Onay' : 'Sil'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionPanel}>
        <ActionRow
          actions={[
            { label: 'Taslağı Kaydet', onPress: saveDraft, variant: 'secondary' },
            { label: 'QR Albüm Hazırla', onPress: prepareAlbum, variant: 'dark' },
          ]}
        />
        <ActionRow
          actions={[
            { label: 'Beklemeye Al', onPress: holdSale, variant: 'quiet' },
            { label: 'Fişi Tamamla', onPress: completeSale, variant: 'primary' },
          ]}
        />
      </View>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  statusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  statusDocument: { color: colors.red, fontSize: typography.section, fontWeight: '900', flex: 1 },
  statusCustomer: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  statusMetricRow: { flexDirection: 'row', gap: spacing.xs },
  metricBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  metricValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900', textAlign: 'center' },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  formPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.xs },
  actionPanel: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  customerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  customerChip: {
    minHeight: 32,
    minWidth: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  customerChipSelected: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  customerChipText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  customerChipTextSelected: { color: colors.surface },
  input: { minHeight: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: typography.body, paddingHorizontal: spacing.md, fontWeight: '800' },
  scanInput: { borderColor: colors.anthracite, backgroundColor: colors.surface },
  disabledInput: { opacity: 0.72 },
  lastScanBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: 2,
  },
  lastScanLabel: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  lastScanBody: { gap: 2 },
  lastScanCode: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  lastScanName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  lastScanMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lastScanEmpty: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  quickCodeRow: { flexDirection: 'row', gap: spacing.xs },
  quickCodeButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  quickCodeText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  productList: { gap: spacing.sm },
  productRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  productMain: { gap: 2, paddingRight: 76 },
  productCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  quantityBlock: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  quantityLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  quantityValue: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  lineActions: { flexDirection: 'row', gap: spacing.xs, paddingRight: 72 },
  lineButton: {
    minHeight: 34,
    minWidth: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  lineButtonText: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900' },
  deleteButton: { backgroundColor: colors.red, borderColor: colors.redDark },
  deleteConfirmButton: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  deleteText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
});
