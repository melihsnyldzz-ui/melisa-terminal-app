import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { addAuditLog, clearActiveSaleDraft, loadActiveSaleDraft, loadSaleDrafts, removeSaleDraft, saveActiveSaleDraft, upsertSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, AppScreen, SaleDraftStatus } from '../../types';
import { formatMoney, normalizeCurrencyCode, normalizeSaleLineCurrency } from '../utils/currencyUtils';
import { colors, radius, spacing, typography } from '../theme';

type OpenSaleDraftsScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

const statusLabels: Record<SaleDraftStatus, string> = {
  open: 'Açık',
  reviewPending: 'Review bekliyor',
  printPending: 'Yazdırma bekliyor',
};

const statusTones: Record<SaleDraftStatus, 'success' | 'warning' | 'dark'> = {
  open: 'success',
  reviewPending: 'warning',
  printPending: 'dark',
};

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function OpenSaleDraftsScreen({ onBack, onNavigate }: OpenSaleDraftsScreenProps) {
  const [drafts, setDrafts] = useState<ActiveSaleDraft[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    const savedDrafts = await loadSaleDrafts();
    setDrafts(savedDrafts);
  };

  const summary = useMemo(() => {
    const totalLines = drafts.reduce((sum, draft) => sum + draft.lines.length, 0);
    const totalQuantity = drafts.reduce((sum, draft) => sum + draft.lines.reduce((lineSum, line) => lineSum + line.quantity, 0), 0);
    return { totalLines, totalQuantity };
  }, [drafts]);

  const continueDraft = async (draft: ActiveSaleDraft) => {
    const nextDraft = { ...draft, draftStatus: 'open' as SaleDraftStatus, updatedAt: new Date().toISOString() };
    await saveActiveSaleDraft(nextDraft);
    await upsertSaleDraft(nextDraft, 'open');
    await addAuditLog({
      operationType: 'Açık fişe devam edildi',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: `${draft.lines.length} kalem düzenlemeye açıldı.`,
      status: 'success',
    });
    onNavigate('newSale');
  };

  const sendToReview = async (draft: ActiveSaleDraft) => {
    const nextDraft = { ...draft, draftStatus: 'reviewPending' as SaleDraftStatus, updatedAt: new Date().toISOString() };
    await saveActiveSaleDraft(nextDraft);
    await upsertSaleDraft(nextDraft, 'reviewPending');
    await addAuditLog({
      operationType: 'Açık fiş review’a gönderildi',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: `${draft.lines.length} kalem review ekranına gönderildi.`,
      status: 'success',
    });
    onNavigate('saleReview');
  };

  const deleteDraft = async (draft: ActiveSaleDraft) => {
    await removeSaleDraft(draft.documentNo);
    const activeDraft = await loadActiveSaleDraft();
    if (activeDraft?.documentNo === draft.documentNo) await clearActiveSaleDraft();
    await addAuditLog({
      operationType: 'Açık fiş silindi',
      customerName: draft.customerName,
      documentNo: draft.documentNo,
      description: 'Açık satış taslağı iptal edildi.',
      status: 'warning',
    });
    setBanner({ message: `${draft.documentNo} taslağı silindi.`, tone: 'info' });
    await loadDrafts();
  };

  return (
    <ScreenShell title="Açık Satış Taslakları" subtitle={`${drafts.length} taslak`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.summaryPanel}>
        <InfoItem label="Taslak" value={drafts.length.toString()} />
        <InfoItem label="Kalem" value={summary.totalLines.toString()} />
        <InfoItem label="Adet" value={summary.totalQuantity.toString()} />
      </View>

      {drafts.length === 0 ? (
        <EmptyState badge="FİŞ" title="Açık satış taslağı yok" description="Yeni Fiş ekranında ürün eklenince taslak burada korunur." />
      ) : (
        drafts.map((draft) => <DraftCard key={draft.documentNo} draft={draft} onContinue={continueDraft} onReview={sendToReview} onDelete={deleteDraft} />)
      )}
    </ScreenShell>
  );
}

function DraftCard({ draft, onContinue, onReview, onDelete }: {
  draft: ActiveSaleDraft;
  onContinue: (draft: ActiveSaleDraft) => void;
  onReview: (draft: ActiveSaleDraft) => void;
  onDelete: (draft: ActiveSaleDraft) => void;
}) {
  const saleCurrency = normalizeCurrencyCode(draft.saleCurrency);
  const lines = draft.lines.map((line) => normalizeSaleLineCurrency(line, saleCurrency, draft.exchangeRateSnapshot));
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = lines.reduce((sum, line) => sum + (line.convertedLineTotal || 0), 0);
  const draftStatus = draft.draftStatus || 'open';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.documentNo}>{draft.documentNo}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{draft.customerName}</Text>
        </View>
        <StatusPill label={statusLabels[draftStatus]} tone={statusTones[draftStatus]} />
      </View>

      <View style={styles.metricRow}>
        <InfoItem label="Para" value={saleCurrency} />
        <InfoItem label="Kalem" value={lines.length.toString()} />
        <InfoItem label="Adet" value={totalQuantity.toString()} />
      </View>
      <View style={styles.metricRow}>
        <InfoItem label="Toplam" value={formatMoney(totalAmount, saleCurrency)} wide />
        <InfoItem label="Güncelleme" value={formatUpdatedAt(draft.updatedAt)} wide />
      </View>
      <Text style={styles.operatorText}>Oluşturan: {draft.createdByName || 'Personel'}{draft.createdByCode ? ` · ${draft.createdByCode}` : ''}</Text>

      <ActionRow
        actions={[
          { label: 'Devam Et', onPress: () => onContinue(draft), variant: 'primary' },
          { label: 'Review', onPress: () => onReview(draft), variant: 'secondary' },
          { label: 'Sil', onPress: () => onDelete(draft), variant: 'dark' },
        ]}
      />
    </View>
  );
}

function InfoItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.infoItem, wide && styles.infoItemWide]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryPanel: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  operatorText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: spacing.xs },
  infoItem: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoItemWide: { minWidth: '48%' },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
});
