import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addAuditLog, addSalePrintJob, loadActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, CurrencyCode, ExchangeRateSnapshot, SaleLine, SalePrintJob } from '../../types';
import { DEFAULT_EXCHANGE_RATES, formatMoney, loadCurrencySettings, normalizeCurrencyCode, normalizeSaleLineCurrency } from '../utils/currencyUtils';
import { formatSaleReceipt } from '../utils/receiptFormatter';
import { colors, radius, spacing, typography } from '../theme';

type SaleReviewScreenProps = {
  onBack: () => void;
  onDone: () => void;
};

const rateLabels: Array<keyof ExchangeRateSnapshot> = ['USD_TO_TRY', 'EUR_TO_TRY', 'EUR_TO_USD', 'USD_TO_EUR'];

const normalizeReviewLines = (lines: SaleLine[], saleCurrency: CurrencyCode, rates: ExchangeRateSnapshot) => lines.map((line) => normalizeSaleLineCurrency(line, saleCurrency, rates));

export function SaleReviewScreen({ onBack, onDone }: SaleReviewScreenProps) {
  const warningLoggedRef = useRef(false);
  const [draft, setDraft] = useState<ActiveSaleDraft | null>(null);
  const [usesDefaultRates, setUsesDefaultRates] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadCurrencySettings()]).then(([savedDraft, currencySettings]) => {
      setDraft(savedDraft);
      setUsesDefaultRates(!currencySettings);
    });
  }, []);

  const review = useMemo(() => {
    const saleCurrency = normalizeCurrencyCode(draft?.saleCurrency);
    const rates = draft?.exchangeRateSnapshot || DEFAULT_EXCHANGE_RATES;
    const lines = normalizeReviewLines(draft?.lines || [], saleCurrency, rates);
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    const totalAmount = lines.reduce((sum, line) => sum + (line.convertedLineTotal || 0), 0);
    const warnings: string[] = [];

    if (lines.length === 0) warnings.push('Satır yok.');
    if (totalAmount <= 0) warnings.push('Genel toplam 0.');
    lines.forEach((line) => {
      if (line.sourceCurrency !== saleCurrency && !line.exchangeRate) warnings.push(`${line.code} için kur eksik.`);
      if (!Number.isFinite(line.convertedUnitPrice)) warnings.push(`${line.code} için dönüştürülmüş fiyat hesaplanmamış.`);
    });
    if (usesDefaultRates) warnings.push('Mock/default kur kullanılıyor.');

    return {
      saleCurrency,
      rates,
      lines,
      lineCount: lines.length,
      totalQuantity,
      subtotal: totalAmount,
      totalAmount,
      warnings,
    };
  }, [draft, usesDefaultRates]);

  useEffect(() => {
    if (!draft || warningLoggedRef.current || review.warnings.length === 0) return;
    warningLoggedRef.current = true;
    void addAuditLog({
      operationType: 'Fiş review uyarısı oluştu',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: review.warnings.join(' · '),
      status: 'warning',
    });
  }, [draft, review.warnings]);

  const confirmSale = async () => {
    if (!draft) {
      setBanner({ message: 'Onaylanacak fiş bulunamadı.', tone: 'error' });
      notifyWarning();
      return;
    }
    if (review.lineCount === 0 || review.totalAmount <= 0) {
      setBanner({ message: 'Satır veya toplam eksik. Fiş onaylanamaz.', tone: 'error' });
      notifyWarning();
      return;
    }

    const printJob: SalePrintJob = {
      id: `${draft.documentNo}-${Date.now()}`,
      documentNo: draft.documentNo,
      customerName: draft.customerName || 'Seçili müşteri yok',
      lineCount: review.lineCount,
      totalQuantity: review.totalQuantity,
      totalAmount: review.totalAmount,
      currency: review.saleCurrency,
      saleCurrency: review.saleCurrency,
      exchangeRateSnapshot: review.rates,
      lines: review.lines.map((line) => ({
        lineId: line.lineId,
        code: line.code,
        name: line.name,
        quantity: line.quantity,
        sourceCurrency: line.sourceCurrency || 'TRY',
        saleCurrency: review.saleCurrency,
        exchangeRate: line.exchangeRate || 1,
        originalUnitPrice: line.originalUnitPrice || line.price,
        convertedUnitPrice: line.convertedUnitPrice || line.price,
        originalLineTotal: line.originalLineTotal || line.quantity * line.price,
        convertedLineTotal: line.convertedLineTotal || line.quantity * line.price,
      })),
      receiptText: formatSaleReceipt({
        documentNo: draft.documentNo,
        customerName: draft.customerName || 'Seçili müşteri yok',
        saleCurrency: review.saleCurrency,
        lines: review.lines,
        exchangeRateSnapshot: review.rates,
        showSourcePrices: false,
      }),
      status: 'Yazdırma bekliyor',
      createdAt: new Date().toISOString(),
    };

    await addSalePrintJob(printJob);
    await addAuditLog({
      operationType: 'Fiş onaylandı',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: `${review.lineCount} kalem · ${review.totalQuantity} adet · ${formatMoney(review.totalAmount, review.saleCurrency)}`,
      status: review.warnings.length > 0 ? 'warning' : 'success',
    });
    await addAuditLog({
      operationType: 'Fiş tamamlandı',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: `${review.lineCount} kalem · ${review.totalQuantity} adet · ${formatMoney(review.totalAmount, review.saleCurrency)}`,
      status: 'success',
    });
    await addAuditLog({
      operationType: 'Yazdırma kuyruğuna gönderildi',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: `${review.lineCount} kalem · ${formatMoney(review.totalAmount, review.saleCurrency)} yazdırma kuyruğuna alındı.`,
      status: 'success',
    });
    await addAuditLog({
      operationType: 'Mock yazdırıldı',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: 'Review onayından sonra local mock yazdırma kaydı oluşturuldu.',
      status: 'success',
    });
    setBanner({ message: `${draft.documentNo} yazdırma kuyruğuna gönderildi.`, tone: 'success' });
    notifySuccess();
    onDone();
  };

  if (!draft) {
    return (
      <ScreenShell title="Fiş Onayı" subtitle="Yazdırma öncesi kontrol" onBack={onBack}>
        <EmptyState badge="FİŞ" title="Aktif fiş bulunamadı" description="Yeni fiş ekranından tekrar deneyin." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Fiş Onayı" subtitle="Yazdırma öncesi son kontrol" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.headerPanel}>
        <View style={styles.headerMain}>
          <Text style={styles.documentNo}>{draft.documentNo}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{draft.customerName}</Text>
        </View>
        <StatusPill label={review.saleCurrency} tone="dark" />
      </View>

      {review.warnings.length > 0 ? (
        <View style={styles.warningPanel}>
          <Text style={styles.warningTitle}>Kontrol uyarısı</Text>
          {review.warnings.map((warning) => <Text key={warning} style={styles.warningText}>{warning}</Text>)}
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <InfoBox label="Kalem" value={review.lineCount.toString()} />
        <InfoBox label="Adet" value={review.totalQuantity.toString()} />
        <InfoBox label="Ara Toplam" value={formatMoney(review.subtotal, review.saleCurrency)} wide />
        <InfoBox label="Genel Toplam" value={formatMoney(review.totalAmount, review.saleCurrency)} wide tone="total" />
      </View>

      <View style={styles.ratePanel}>
        <Text style={styles.sectionTitle}>Kur Snapshot</Text>
        <View style={styles.rateGrid}>
          {rateLabels.map((label) => (
            <View key={label} style={styles.rateBox}>
              <Text style={styles.rateLabel}>{label}</Text>
              <Text style={styles.rateValue}>{review.rates[label]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.linesPanel}>
        <Text style={styles.sectionTitle}>Satırlar</Text>
        {review.lines.length === 0 ? (
          <Text style={styles.emptyText}>Satır yok</Text>
        ) : (
          review.lines.map((line) => (
            <View key={line.lineId} style={styles.lineRow}>
              <View style={styles.lineMain}>
                <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
                <Text style={styles.lineMeta}>{line.quantity} adet · {formatMoney(line.convertedUnitPrice || 0, review.saleCurrency)}</Text>
                {line.sourceCurrency !== review.saleCurrency ? <Text style={styles.sourceText}>Kaynak: {formatMoney(line.originalUnitPrice || 0, line.sourceCurrency || 'TRY')}</Text> : null}
              </View>
              <Text style={styles.lineTotal}>{formatMoney(line.convertedLineTotal || 0, review.saleCurrency)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>Geri Dön</Text>
        </Pressable>
        <AppButton label="Fişi Onayla ve Yazdırma Kuyruğuna Gönder" onPress={confirmSale} variant="primary" compact />
      </View>
    </ScreenShell>
  );
}

function InfoBox({ label, value, wide = false, tone }: { label: string; value: string; wide?: boolean; tone?: 'total' }) {
  return (
    <View style={[styles.infoBox, wide && styles.infoBoxWide]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, tone === 'total' && styles.totalValue]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerPanel: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.lg,
    borderBottomWidth: 3,
    borderBottomColor: colors.red,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerMain: { flex: 1, gap: 2 },
  documentNo: { color: colors.surface, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  warningPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: 2,
  },
  warningTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900' },
  warningText: { color: colors.text, fontSize: typography.small, fontWeight: '800' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  infoBox: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoBoxWide: { minWidth: '98%' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  totalValue: { color: colors.red, fontSize: typography.section },
  ratePanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rateBox: {
    width: '48%',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
  },
  rateLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  rateValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  linesPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  emptyText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lineRow: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  lineMain: { flex: 1, gap: 2 },
  lineName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  lineMeta: { color: colors.anthracite, fontSize: typography.small, fontWeight: '800' },
  sourceText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lineTotal: { color: colors.red, fontSize: typography.body, fontWeight: '900', minWidth: 86, textAlign: 'right' },
  actions: { gap: spacing.xs },
  backButton: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
