import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { loadActivePickingDraft, saveActivePickingDraft } from '../../storage/localStorage';
import type { ActivePickingDraft, PickingLine } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PickingScreenProps = {
  onBack: () => void;
};

const fallbackDraft: ActivePickingDraft = {
  documentNo: 'FIS-PICK-001',
  customerName: 'Test toplama fişi',
  status: 'Toplanacak',
  updatedAt: 'Mock',
  lines: [
    { id: 'pick-1', code: '0000051461011', name: '12 Lİ FİGÜRLÜ PATİK', quantity: 2, picked: 0 },
    { id: 'pick-2', code: '8697691102551', name: 'SALYY MALZEME ÇANTASI', quantity: 1, picked: 0 },
    { id: 'pick-3', code: 'MB-1001', name: 'Bebek Takım', quantity: 3, picked: 0 },
  ],
};

const normalizeBarcode = (value: string) => value.replace(/[\r\n]/g, '').trim().toUpperCase();

const getPickingStatus = (lines: PickingLine[]): ActivePickingDraft['status'] => {
  const totalRequired = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalPicked = lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0);
  if (totalRequired > 0 && totalPicked >= totalRequired) return 'Tamamlandı';
  if (totalPicked > 0) return 'Toplanıyor';
  return 'Toplanacak';
};

export function PickingScreen({ onBack }: PickingScreenProps) {
  const barcodeInputRef = useRef<TextInput>(null);
  const [barcode, setBarcode] = useState('');
  const [draft, setDraft] = useState<ActivePickingDraft>(fallbackDraft);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const lines = draft.lines;
  const totalRequired = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalPicked = useMemo(() => lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0), [lines]);
  const remaining = Math.max(0, totalRequired - totalPicked);
  const completed = totalRequired > 0 && remaining === 0;

  useEffect(() => {
    loadActivePickingDraft().then((savedDraft) => {
      if (savedDraft) {
        setDraft(savedDraft);
        setBanner({ message: `${savedDraft.documentNo} toplama fişi açıldı.`, tone: 'info' });
      }
      setTimeout(() => barcodeInputRef.current?.focus(), 120);
    });
  }, []);

  const focusBarcode = () => setTimeout(() => barcodeInputRef.current?.focus(), 80);

  const persistDraft = async (nextLines: PickingLine[], message?: string, tone: ToastTone = 'success') => {
    const nextDraft: ActivePickingDraft = {
      ...draft,
      status: getPickingStatus(nextLines),
      lines: nextLines,
      updatedAt: 'Şimdi',
    };
    setDraft(nextDraft);
    await saveActivePickingDraft(nextDraft);
    if (message) setBanner({ message, tone });
  };

  const scanBarcode = (rawCode = barcode) => {
    const code = normalizeBarcode(rawCode);
    if (!code) {
      setBanner({ message: 'Barkod okut veya yaz.', tone: 'warning' });
      notifyWarning();
      focusBarcode();
      return;
    }

    const target = lines.find((line) => line.code === code);
    if (!target) {
      setBanner({ message: `YANLIŞ ÜRÜN: ${code}`, tone: 'error' });
      notifyWarning();
      setBarcode('');
      focusBarcode();
      return;
    }

    if (target.picked >= target.quantity) {
      setBanner({ message: `${target.name} zaten tamamlandı.`, tone: 'info' });
      notifyWarning();
      setBarcode('');
      focusBarcode();
      return;
    }

    const nextLines = lines.map((line) => (line.id === target.id ? { ...line, picked: Math.min(line.quantity, line.picked + 1) } : line));
    setBarcode('');
    void persistDraft(nextLines, `✓ TOPLANDI: ${target.name}`);
    notifySuccess();
    focusBarcode();
  };

  const handleBarcodeChange = (value: string) => {
    if (value.includes('\n') || value.includes('\r')) {
      const code = normalizeBarcode(value);
      setBarcode(code);
      scanBarcode(code);
      return;
    }
    setBarcode(value);
  };

  const toggleLine = (lineId: string) => {
    const nextLines = lines.map((line) => {
      if (line.id !== lineId) return line;
      return line.picked >= line.quantity ? { ...line, picked: 0 } : { ...line, picked: line.quantity };
    });
    void persistDraft(nextLines, 'Toplama satırı güncellendi.', 'info');
    focusBarcode();
  };

  return (
    <ScreenShell title="Toplama" subtitle="Scan-to-confirm hızlı depo modu" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
          <Text style={styles.documentNo}>{draft.documentNo}</Text>
          <StatusPill label={completed ? 'Tamamlandı' : `${totalPicked}/${totalRequired}`} tone={completed ? 'success' : 'warning'} />
        </View>
        <Text style={styles.customerName}>{draft.customerName}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totalRequired ? Math.round((totalPicked / totalRequired) * 100) : 0}%` }]} />
        </View>
        <Text style={styles.remainingText}>{completed ? 'TOPLAMA TAMAMLANDI' : `${remaining} adet kaldı · ${draft.status}`}</Text>
      </View>

      <View style={styles.scanPanel}>
        <Text style={styles.scanLabel}>BARKOD</Text>
        <TextInput
          ref={barcodeInputRef}
          value={barcode}
          onChangeText={handleBarcodeChange}
          onSubmitEditing={() => scanBarcode()}
          autoFocus
          autoCapitalize="characters"
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="Okut veya yaz"
          placeholderTextColor={colors.muted}
          style={styles.scanInput}
        />
        <Pressable onPress={() => scanBarcode()} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
          <Text style={styles.scanButtonText}>OKUTULANI ONAYLA</Text>
        </Pressable>
      </View>

      <View style={styles.listPanel}>
        {lines.map((line) => {
          const done = line.picked >= line.quantity;
          return (
            <Pressable key={line.id} onPress={() => toggleLine(line.id)} style={({ pressed }) => [styles.lineRow, done && styles.lineDone, pressed && styles.pressed]}>
              <Text style={[styles.checkBox, done && styles.checkBoxDone]}>{done ? '☑' : '☐'}</Text>
              <View style={styles.lineMain}>
                <Text style={styles.lineCode}>{line.code}</Text>
                <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyValue}>{line.picked}/{line.quantity}</Text>
                <Text style={styles.qtyLabel}>ADET</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerPanel: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: colors.red,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  documentNo: { color: colors.surface, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.surface, fontSize: typography.small, fontWeight: '800' },
  progressTrack: { height: 10, borderRadius: radius.sm, backgroundColor: '#30343a', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.red },
  remainingText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  scanPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  scanLabel: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  scanInput: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.anthracite,
    backgroundColor: colors.surfaceSoft,
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
  },
  scanButton: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  listPanel: { gap: spacing.xs },
  lineRow: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  lineDone: { backgroundColor: colors.successSoft, borderColor: colors.success },
  checkBox: { width: 32, color: colors.anthracite, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  checkBoxDone: { color: colors.success },
  lineMain: { flex: 1, gap: 2 },
  lineCode: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  lineName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  qtyBox: {
    minWidth: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  qtyValue: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  qtyLabel: { color: colors.surface, fontSize: 9, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
