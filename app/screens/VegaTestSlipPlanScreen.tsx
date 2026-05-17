import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { formatMoney, normalizeCurrencyCode } from '../utils/currencyUtils';
import { loadActiveSaleDraft, loadSaleDrafts } from '../../storage/localStorage';
import type { ActiveSaleDraft, AppScreen, CurrencyCode, SaleLine } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type VegaTestSlipPlanScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type MappingRow = {
  label: string;
  value: string;
  vegaColumn: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Tarih yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getLineUnitPrice = (line: SaleLine) => {
  if (Number.isFinite(line.convertedUnitPrice)) return line.convertedUnitPrice || 0;
  if (Number.isFinite(line.price)) return line.price || 0;
  return 0;
};

const getDraftTotal = (draft: ActiveSaleDraft) => draft.lines.reduce((sum, line) => {
  if (Number.isFinite(line.convertedLineTotal)) return sum + (line.convertedLineTotal || 0);
  return sum + getLineUnitPrice(line) * line.quantity;
}, 0);

function choosePlanDraft(activeDraft: ActiveSaleDraft | null, drafts: ActiveSaleDraft[]) {
  if (activeDraft?.documentNo || (activeDraft?.lines.length || 0) > 0) return activeDraft;
  return [...drafts].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] || null;
}

export function VegaTestSlipPlanScreen({ onBack, onNavigate }: VegaTestSlipPlanScreenProps) {
  const [activeDraft, setActiveDraft] = useState<ActiveSaleDraft | null>(null);
  const [drafts, setDrafts] = useState<ActiveSaleDraft[]>([]);

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadSaleDrafts()]).then(([savedActiveDraft, savedDrafts]) => {
      setActiveDraft(savedActiveDraft);
      setDrafts(savedDrafts);
    });
  }, []);

  const draft = useMemo(() => choosePlanDraft(activeDraft, drafts), [activeDraft, drafts]);
  const saleCurrency = normalizeCurrencyCode(draft?.saleCurrency);
  const totalAmount = draft ? getDraftTotal(draft) : 0;
  const totalQuantity = draft?.lines.reduce((sum, line) => sum + line.quantity, 0) || 0;

  const headerRows: MappingRow[] = draft ? [
    { label: 'Evrak no / draft id', value: draft.documentNo, vegaColumn: 'EVRAKNO / header.IND bağlantısı' },
    { label: 'Müşteri / cari', value: draft.customerName || 'Müşteri yok', vegaColumn: 'CARI / CARIKODU' },
    { label: 'Tarih', value: formatDateTime(draft.updatedAt), vegaColumn: 'TARIH / KAYITTARIHI' },
    { label: 'Toplam tutar', value: formatMoney(totalAmount, saleCurrency), vegaColumn: 'GENELTOPLAM' },
    { label: 'Para birimi', value: saleCurrency, vegaColumn: 'PB / DOVIZKODU' },
  ] : [];

  return (
    <ScreenShell title="Vega Test Fişi Planı" subtitle="Yazmadan önce alan eşleme" onBack={onBack}>
      <View style={styles.dangerPanel}>
        <View style={styles.panelTop}>
          <View style={styles.flexText}>
            <Text style={styles.kicker}>YAZMA YOK</Text>
            <Text style={styles.dangerTitle}>Bu ekran sadece plan gösterir, Vega’ya veri yazmaz.</Text>
          </View>
          <StatusPill label="INSERT yok" tone="danger" />
        </View>
        <Text style={styles.panelText}>Satış fişi oluşturma, stok düşme, cari hareket veya local-price-service write endpoint işlemi yoktur. Sadece local satış taslağı okunur.</Text>
      </View>

      {!draft ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Plan oluşturmak için önce bir test satış taslağı aç.</Text>
          <Text style={styles.emptyText}>Müşteri seçip satış ekranında bir ürün eklediğinde bu ekranda Vega başlık/satır planı görünecek.</Text>
          <AppButton label="Test Satışı Aç" onPress={() => onNavigate('salesCustomer')} variant="primary" compact />
        </View>
      ) : (
        <>
          <View style={styles.summaryPanel}>
            <View style={styles.panelTop}>
              <View style={styles.flexText}>
                <Text style={styles.kicker}>PLAN KAYNAĞI</Text>
                <Text style={styles.summaryTitle}>{draft.customerName || 'Müşteri yok'}</Text>
                <Text style={styles.summaryText}>{draft.documentNo} · {draft.lines.length} satır · {totalQuantity} adet</Text>
              </View>
              <StatusPill label={draft === activeDraft ? 'Aktif taslak' : 'Son taslak'} tone="warning" />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Başlık planı</Text>
            <StatusPill label="Header" tone="dark" />
          </View>
          <View style={styles.mappingList}>
            {headerRows.map((row) => <MappingCard key={row.label} row={row} />)}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Satır planı</Text>
            <StatusPill label={`${draft.lines.length} satır`} tone={draft.lines.length > 0 ? 'success' : 'warning'} />
          </View>
          {draft.lines.length > 0 ? (
            <View style={styles.lineList}>
              {draft.lines.map((line, index) => (
                <LinePlanCard key={line.lineId || `${line.code}-${index}`} line={line} index={index} saleCurrency={saleCurrency} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>Taslakta ürün satırı yok.</Text>
              <Text style={styles.emptyText}>Satır planı için barkod okutulmuş ve fişe eklenmiş ürün gerekir.</Text>
            </View>
          )}

          <View style={styles.safeNextBox}>
            <Text style={styles.safeNextTitle}>Güvenli sonraki adım</Text>
            <Text style={styles.safeNextText}>Bu plan, Vega Kolon Keşfi sonuçlarıyla karşılaştırılmalı. Eksik kolon veya belirsiz cari/stok alanı varsa write-back açılmamalı.</Text>
          </View>
        </>
      )}
    </ScreenShell>
  );
}

function MappingCard({ row }: { row: MappingRow }) {
  return (
    <View style={styles.mappingCard}>
      <View style={styles.flexText}>
        <Text style={styles.mappingLabel}>{row.label}</Text>
        <Text style={styles.mappingValue}>{row.value}</Text>
      </View>
      <View style={styles.columnBox}>
        <Text style={styles.columnLabel}>Vega kolon</Text>
        <Text style={styles.columnValue}>{row.vegaColumn}</Text>
      </View>
    </View>
  );
}

function LinePlanCard({ line, index, saleCurrency }: { line: SaleLine; index: number; saleCurrency: CurrencyCode }) {
  const sourceCurrency = normalizeCurrencyCode(line.sourceCurrency || line.currency);
  const unitPrice = getLineUnitPrice(line);
  const rows: MappingRow[] = [
    { label: 'Barkod', value: line.code || 'Barkod yok', vegaColumn: 'BARKOD' },
    { label: 'Stok kodu', value: line.code || 'Stok kodu yok', vegaColumn: 'STOKKODU / STOKNO' },
    { label: 'Ürün adı', value: line.name || 'Ürün adı yok', vegaColumn: 'ACIKLAMA / MALINCINSI' },
    { label: 'Adet', value: line.quantity.toString(), vegaColumn: 'MIKTAR' },
    { label: 'Fiyat', value: formatMoney(unitPrice, saleCurrency), vegaColumn: 'FIYAT' },
    { label: 'Para birimi', value: saleCurrency, vegaColumn: 'PB / DOVIZKODU' },
  ];

  return (
    <View style={styles.lineCard}>
      <View style={styles.panelTop}>
        <View style={styles.flexText}>
          <Text style={styles.lineTitle}>{index + 1}. {line.name || 'Ürün adı yok'}</Text>
          <Text style={styles.lineMeta}>Kaynak: {formatMoney(line.originalUnitPrice || unitPrice, sourceCurrency)}</Text>
        </View>
        <StatusPill label={sourceCurrency === saleCurrency ? 'Aynı PB' : 'Kur çevrildi'} tone={sourceCurrency === saleCurrency ? 'success' : 'warning'} />
      </View>
      <View style={styles.mappingList}>
        {rows.map((row) => <MappingCard key={`${line.lineId}-${row.label}`} row={row} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dangerPanel: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#f3bcc5',
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  panelTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  flexText: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  dangerTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  panelText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  emptyPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#efd5a7',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  emptyTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900' },
  emptyText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  summaryText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  mappingList: { gap: spacing.xs },
  mappingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  mappingLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  mappingValue: { color: colors.ink, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  columnBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  columnLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  columnValue: { color: colors.text, fontSize: typography.small, fontWeight: '900', lineHeight: 15 },
  lineList: { gap: spacing.sm },
  lineCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.line,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  lineTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  lineMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  safeNextBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bce7c8',
    padding: spacing.sm,
    gap: 2,
  },
  safeNextTitle: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  safeNextText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
