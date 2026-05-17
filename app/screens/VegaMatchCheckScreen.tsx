import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { formatMoney, normalizeCurrencyCode } from '../utils/currencyUtils';
import { loadActiveSaleDraft, loadSelectedSalesCustomer } from '../../storage/localStorage';
import type { ActiveSaleDraft, AppScreen, SaleLine, SalesCustomer } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type VegaMatchCheckScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type MatchTone = 'success' | 'warning' | 'danger';

function getCustomerTone(draft: ActiveSaleDraft | null, customer: SalesCustomer | null): MatchTone {
  if (!draft?.customerName) return 'danger';
  if (!customer?.code) return 'warning';
  return 'warning';
}

function getLineTone(line: SaleLine): MatchTone {
  const hasCode = Boolean(line.code);
  const hasName = Boolean(line.name);
  const hasPrice = Number.isFinite(line.convertedUnitPrice || line.price) && (line.convertedUnitPrice || line.price || 0) > 0;
  if (!hasCode || !hasName || !hasPrice) return 'danger';
  return 'warning';
}

function getToneLabel(tone: MatchTone) {
  if (tone === 'success') return 'Hazır';
  if (tone === 'danger') return 'Eksik';
  return 'Riskli';
}

function getLinePrice(line: SaleLine) {
  if (Number.isFinite(line.convertedUnitPrice)) return line.convertedUnitPrice || 0;
  if (Number.isFinite(line.price)) return line.price || 0;
  return 0;
}

export function VegaMatchCheckScreen({ onBack, onNavigate }: VegaMatchCheckScreenProps) {
  const [draft, setDraft] = useState<ActiveSaleDraft | null>(null);
  const [customer, setCustomer] = useState<SalesCustomer | null>(null);

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadSelectedSalesCustomer()]).then(([activeDraft, selectedCustomer]) => {
      setDraft(activeDraft);
      setCustomer(selectedCustomer);
    });
  }, []);

  const customerTone = getCustomerTone(draft, customer);
  const lineStats = useMemo(() => {
    const tones = draft?.lines.map(getLineTone) || [];
    return {
      ready: tones.filter((tone) => tone === 'success').length,
      risky: tones.filter((tone) => tone === 'warning').length,
      missing: tones.filter((tone) => tone === 'danger').length,
    };
  }, [draft]);
  const hasIssue = customerTone !== 'success' || lineStats.risky > 0 || lineStats.missing > 0;

  return (
    <ScreenShell title="Vega Eşleşme Kontrolü" subtitle="Cari/stok read-only ön kontrol" onBack={onBack}>
      <View style={styles.dangerPanel}>
        <View style={styles.panelTop}>
          <View style={styles.flexText}>
            <Text style={styles.kicker}>YAZMA YOK</Text>
            <Text style={styles.dangerTitle}>Bu ekran sadece eşleşme kontrolü yapar, Vega’ya veri yazmaz.</Text>
          </View>
          <StatusPill label="Read-only" tone="danger" />
        </View>
        <Text style={styles.panelText}>INSERT, UPDATE, DELETE, satış fişi oluşturma, stok düşme veya cari hareket işlemi yoktur. Ayrı Vega cari/stok doğrulama endpoint’i olmadığı için bu ekran güvenli ön kontrol gösterir.</Text>
      </View>

      {!draft?.documentNo ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Kontrol için önce test satış taslağı aç.</Text>
          <Text style={styles.emptyText}>Müşteri seçip satış ekranında ürün ekleyince cari/stok eşleşme kontrolü burada görünecek.</Text>
          <AppButton label="Test Satışı Aç" onPress={() => onNavigate('salesCustomer')} variant="primary" compact />
        </View>
      ) : (
        <>
          <View style={[styles.resultPanel, hasIssue ? styles.resultWarning : styles.resultSuccess]}>
            <View style={styles.panelTop}>
              <View style={styles.flexText}>
                <Text style={styles.kicker}>GENEL SONUÇ</Text>
                <Text style={[styles.resultTitle, hasIssue ? styles.warningText : styles.successText]}>
                  {hasIssue ? 'Vega’ya yazmadan önce kontrol edilmesi gereken eşleşmeler var.' : 'Cari ve stok eşleşmeleri hazır görünüyor.'}
                </Text>
              </View>
              <StatusPill label={hasIssue ? 'Kontrol gerekli' : 'Hazır'} tone={hasIssue ? 'warning' : 'success'} />
            </View>
            <Text style={styles.panelText}>Vega doğrulaması için ileride read-only cari/stok match endpoint’i bağlanmalı.</Text>
          </View>

          <View style={styles.summaryGrid}>
            <InfoBox label="Hazır" value={lineStats.ready.toString()} tone="success" />
            <InfoBox label="Riskli" value={lineStats.risky.toString()} tone="warning" />
            <InfoBox label="Eksik" value={lineStats.missing.toString()} tone="danger" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Müşteri / cari</Text>
            <StatusPill label={getToneLabel(customerTone)} tone={customerTone} />
          </View>
          <View style={[styles.matchCard, customerTone === 'danger' && styles.cardDanger, customerTone === 'warning' && styles.cardWarning]}>
            <InfoLine label="Terminal müşteri" value={draft.customerName || 'Müşteri yok'} />
            <InfoLine label="Terminal müşteri kodu" value={customer?.code || 'Kod yok'} />
            <InfoLine label="Vega cari kodu" value={customer?.code ? `${customer.code} aday` : 'Bulunmadı'} />
            <InfoLine label="Durum" value={customer?.code ? 'Aday cari kodu var, Vega doğrulaması için endpoint gerekli.' : 'Cari kodu eksik veya Vega’da doğrulanmadı.'} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ürün / stok</Text>
            <StatusPill label={`${draft.lines.length} satır`} tone={draft.lines.length > 0 ? 'warning' : 'danger'} />
          </View>
          {draft.lines.length > 0 ? (
            <View style={styles.lineList}>
              {draft.lines.map((line, index) => <StockMatchCard key={line.lineId || `${line.code}-${index}`} line={line} index={index} />)}
            </View>
          ) : (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>Taslakta ürün satırı yok.</Text>
              <Text style={styles.emptyText}>Stok eşleşmesi için önce barkod okutulmuş ürün gerekir.</Text>
            </View>
          )}
        </>
      )}
    </ScreenShell>
  );
}

function StockMatchCard({ line, index }: { line: SaleLine; index: number }) {
  const tone = getLineTone(line);
  const currency = normalizeCurrencyCode(line.saleCurrency || line.currency);
  const price = getLinePrice(line);

  return (
    <View style={[styles.matchCard, tone === 'danger' && styles.cardDanger, tone === 'warning' && styles.cardWarning, tone === 'success' && styles.cardSuccess]}>
      <View style={styles.panelTop}>
        <View style={styles.flexText}>
          <Text style={styles.lineTitle}>{index + 1}. {line.name || 'Ürün adı yok'}</Text>
          <Text style={styles.lineMeta}>{line.code || 'Barkod yok'} · {formatMoney(price, currency)}</Text>
        </View>
        <StatusPill label={getToneLabel(tone)} tone={tone} />
      </View>
      <InfoLine label="Barkod" value={line.code || 'Barkod yok'} />
      <InfoLine label="Terminal stok kodu" value={line.code || 'Stok kodu yok'} />
      <InfoLine label="Vega stok kodu / stok no" value={line.code ? `${line.code} aday` : 'Bulunmadı'} />
      <InfoLine label="Fiyat" value={price > 0 ? formatMoney(price, currency) : 'Fiyat yok'} />
      <InfoLine label="Durum" value={tone === 'danger' ? 'Barkod, ürün adı veya fiyat eksik.' : 'Terminal verisi var; Vega doğrulaması için read-only endpoint gerekli.'} />
    </View>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone: MatchTone }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText, tone === 'danger' && styles.dangerText]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={styles.infoLineValue}>{value}</Text>
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
  resultPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  resultSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  resultWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  resultTitle: { fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  summaryGrid: { flexDirection: 'row', gap: spacing.xs },
  infoBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.line,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardSuccess: { backgroundColor: colors.successSoft, borderColor: '#bce7c8', borderLeftColor: colors.success },
  cardWarning: { backgroundColor: colors.warningSoft, borderColor: '#efd5a7', borderLeftColor: colors.amber },
  cardDanger: { backgroundColor: colors.dangerSoft, borderColor: '#f3bcc5', borderLeftColor: colors.red },
  lineList: { gap: spacing.sm },
  lineTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  lineMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoLine: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoLineLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoLineValue: { color: colors.text, fontSize: typography.small, fontWeight: '900', lineHeight: 15 },
  successText: { color: colors.success },
  warningText: { color: colors.amber },
  dangerText: { color: colors.red },
});
