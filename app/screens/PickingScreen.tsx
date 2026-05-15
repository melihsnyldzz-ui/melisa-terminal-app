import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { loadActivePickingDraft, saveActivePickingDraft } from '../../storage/localStorage';
import type { ActivePickingDraft, PackingBox, PickingLine } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PickingScreenProps = {
  onBack: () => void;
};

const fallbackDraft: ActivePickingDraft = {
  documentNo: 'FIS-PICK-001',
  customerName: 'Test toplama fişi',
  status: 'Toplanacak',
  updatedAt: 'Mock',
  boxes: [{ id: 'box-1', label: 'Koli 1', lines: [] }],
  activeBoxId: 'box-1',
  packingStatus: 'Kolilenmedi',
  lines: [
    { id: 'pick-1', code: '0000051461011', name: '12 Lİ FİGÜRLÜ PATİK', quantity: 2, picked: 0 },
    { id: 'pick-2', code: '8697691102551', name: 'SALYY MALZEME ÇANTASI', quantity: 1, picked: 0 },
    { id: 'pick-3', code: 'MB-1001', name: 'Bebek Takım', quantity: 3, picked: 0 },
  ],
};

const normalizeBarcode = (value: string) => value.replace(/[\r\n]/g, '').trim().toUpperCase();

const ensureBoxes = (draft: ActivePickingDraft): ActivePickingDraft => {
  const boxes = draft.boxes?.length ? draft.boxes : [{ id: 'box-1', label: 'Koli 1', lines: [] }];
  return { ...draft, boxes, activeBoxId: draft.activeBoxId || boxes[0].id, packingStatus: draft.packingStatus || 'Kolilenmedi' };
};

const getPickingStatus = (lines: PickingLine[]): ActivePickingDraft['status'] => {
  const totalRequired = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalPicked = lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0);
  if (totalRequired > 0 && totalPicked >= totalRequired) return 'Tamamlandı';
  if (totalPicked > 0) return 'Toplanıyor';
  return 'Toplanacak';
};

const getPackedQuantity = (boxes: PackingBox[], lineId?: string) => boxes.reduce((sum, box) => {
  if (!lineId) return sum + box.lines.reduce((boxSum, line) => boxSum + line.quantity, 0);
  return sum + box.lines.filter((line) => line.lineId === lineId).reduce((boxSum, line) => boxSum + line.quantity, 0);
}, 0);

const getPackingStatus = (lines: PickingLine[], boxes: PackingBox[]): ActivePickingDraft['packingStatus'] => {
  const totalPicked = lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0);
  const totalPacked = getPackedQuantity(boxes);
  if (totalPicked > 0 && totalPacked >= totalPicked) return 'Kolilendi';
  if (totalPacked > 0) return 'Kolileniyor';
  return 'Kolilenmedi';
};

export function PickingScreen({ onBack }: PickingScreenProps) {
  const barcodeInputRef = useRef<TextInput>(null);
  const [barcode, setBarcode] = useState('');
  const [draft, setDraft] = useState<ActivePickingDraft>(fallbackDraft);
  const [mode, setMode] = useState<'picking' | 'packing'>('picking');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const safeDraft = ensureBoxes(draft);
  const lines = safeDraft.lines;
  const boxes = safeDraft.boxes || [];
  const activeBox = boxes.find((box) => box.id === safeDraft.activeBoxId) || boxes[0];
  const totalRequired = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalPicked = useMemo(() => lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0), [lines]);
  const totalPacked = useMemo(() => getPackedQuantity(boxes), [boxes]);
  const remaining = Math.max(0, totalRequired - totalPicked);
  const packRemaining = Math.max(0, totalPicked - totalPacked);
  const completed = totalRequired > 0 && remaining === 0;

  useEffect(() => {
    loadActivePickingDraft().then((savedDraft) => {
      if (savedDraft) {
        const nextDraft = ensureBoxes(savedDraft);
        setDraft(nextDraft);
        setBanner({ message: `${nextDraft.documentNo} toplama fişi açıldı.`, tone: 'info' });
      }
      setTimeout(() => barcodeInputRef.current?.focus(), 120);
    });
  }, []);

  const focusBarcode = () => setTimeout(() => barcodeInputRef.current?.focus(), 80);

  const persistDraft = async (nextDraft: ActivePickingDraft, message?: string, tone: ToastTone = 'success') => {
    const draftWithBoxes = ensureBoxes(nextDraft);
    const finalDraft: ActivePickingDraft = {
      ...draftWithBoxes,
      status: getPickingStatus(draftWithBoxes.lines),
      packingStatus: getPackingStatus(draftWithBoxes.lines, draftWithBoxes.boxes || []),
      updatedAt: 'Şimdi',
    };
    setDraft(finalDraft);
    await saveActivePickingDraft(finalDraft);
    if (message) setBanner({ message, tone });
  };

  const persistLines = async (nextLines: PickingLine[], message?: string, tone: ToastTone = 'success') => {
    await persistDraft({ ...safeDraft, lines: nextLines }, message, tone);
  };

  const addToActiveBox = async (line: PickingLine) => {
    const packedForLine = getPackedQuantity(boxes, line.id);
    if (packedForLine >= line.picked) {
      setBanner({ message: `${line.name} için kolilenecek adet kalmadı.`, tone: 'info' });
      notifyWarning();
      focusBarcode();
      return;
    }

    const nextBoxes = boxes.map((box) => {
      if (box.id !== activeBox.id) return box;
      const existing = box.lines.find((boxLine) => boxLine.lineId === line.id);
      if (existing) {
        return { ...box, lines: box.lines.map((boxLine) => boxLine.lineId === line.id ? { ...boxLine, quantity: boxLine.quantity + 1 } : boxLine) };
      }
      return { ...box, lines: [...box.lines, { lineId: line.id, code: line.code, name: line.name, quantity: 1 }] };
    });

    await persistDraft({ ...safeDraft, boxes: nextBoxes, packingStatus: 'Kolileniyor' }, `📦 ${activeBox.label}: ${line.name}`);
    notifySuccess();
    focusBarcode();
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

    setBarcode('');
    if (mode === 'packing') {
      void addToActiveBox(target);
      return;
    }

    if (target.picked >= target.quantity) {
      setBanner({ message: `${target.name} zaten tamamlandı.`, tone: 'info' });
      notifyWarning();
      focusBarcode();
      return;
    }

    const nextLines = lines.map((line) => (line.id === target.id ? { ...line, picked: Math.min(line.quantity, line.picked + 1) } : line));
    void persistLines(nextLines, `✓ TOPLANDI: ${target.name}`);
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
    void persistLines(nextLines, 'Toplama satırı güncellendi.', 'info');
    focusBarcode();
  };

  const addBox = () => {
    const nextIndex = boxes.length + 1;
    const nextBox: PackingBox = { id: `box-${Date.now()}`, label: `Koli ${nextIndex}`, lines: [] };
    void persistDraft({ ...safeDraft, boxes: [...boxes, nextBox], activeBoxId: nextBox.id, packingStatus: 'Kolileniyor' }, `${nextBox.label} açıldı.`, 'info');
    focusBarcode();
  };

  return (
    <ScreenShell title="Toplama" subtitle="Scan-to-confirm hızlı depo modu" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
          <Text style={styles.documentNo}>{safeDraft.documentNo}</Text>
          <StatusPill label={completed ? 'Tamamlandı' : `${totalPicked}/${totalRequired}`} tone={completed ? 'success' : 'warning'} />
        </View>
        <Text style={styles.customerName}>{safeDraft.customerName}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totalRequired ? Math.round((totalPicked / totalRequired) * 100) : 0}%` }]} />
        </View>
        <Text style={styles.remainingText}>{completed ? `TOPLAMA TAMAMLANDI · Koli kalan ${packRemaining}` : `${remaining} adet kaldı · ${safeDraft.status}`}</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode('picking')} style={({ pressed }) => [styles.modeButton, mode === 'picking' && styles.modeActive, pressed && styles.pressed]}>
          <Text style={[styles.modeText, mode === 'picking' && styles.modeTextActive]}>TOPLAMA</Text>
        </Pressable>
        <Pressable onPress={() => setMode('packing')} style={({ pressed }) => [styles.modeButton, mode === 'packing' && styles.modeActive, pressed && styles.pressed]}>
          <Text style={[styles.modeText, mode === 'packing' && styles.modeTextActive]}>KOLİLEME</Text>
        </Pressable>
      </View>

      <View style={styles.scanPanel}>
        <Text style={styles.scanLabel}>{mode === 'packing' ? `BARKOD · ${activeBox.label}` : 'BARKOD'}</Text>
        <TextInput
          ref={barcodeInputRef}
          value={barcode}
          onChangeText={handleBarcodeChange}
          onSubmitEditing={() => scanBarcode()}
          autoFocus
          autoCapitalize="characters"
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={mode === 'packing' ? 'Koliye koymak için okut' : 'Okut veya yaz'}
          placeholderTextColor={colors.muted}
          style={styles.scanInput}
        />
        <Pressable onPress={() => scanBarcode()} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
          <Text style={styles.scanButtonText}>{mode === 'packing' ? 'KOLİYE EKLE' : 'OKUTULANI ONAYLA'}</Text>
        </Pressable>
      </View>

      {mode === 'packing' ? (
        <View style={styles.packingPanel}>
          <View style={styles.boxHeaderRow}>
            <Text style={styles.boxTitle}>{activeBox.label}</Text>
            <Pressable onPress={addBox} style={({ pressed }) => [styles.addBoxButton, pressed && styles.pressed]}>
              <Text style={styles.addBoxText}>+ Koli</Text>
            </Pressable>
          </View>
          <Text style={styles.boxMeta}>{totalPacked}/{totalPicked} adet kolilendi · {safeDraft.packingStatus || 'Kolilenmedi'}</Text>
          <View style={styles.boxTabs}>
            {boxes.map((box) => (
              <Pressable key={box.id} onPress={() => void persistDraft({ ...safeDraft, activeBoxId: box.id }, `${box.label} aktif.`, 'info')} style={({ pressed }) => [styles.boxTab, box.id === activeBox.id && styles.boxTabActive, pressed && styles.pressed]}>
                <Text style={[styles.boxTabText, box.id === activeBox.id && styles.boxTabTextActive]}>{box.label}</Text>
              </Pressable>
            ))}
          </View>
          {activeBox.lines.length === 0 ? <Text style={styles.emptyBoxText}>Bu koli boş. Barkod okutarak ürün ekle.</Text> : activeBox.lines.map((line) => (
            <View key={line.lineId} style={styles.boxLine}>
              <View style={styles.lineMain}>
                <Text style={styles.lineCode}>{line.code}</Text>
                <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
              </View>
              <View style={styles.qtyBox}><Text style={styles.qtyValue}>{line.quantity}</Text><Text style={styles.qtyLabel}>KOLİ</Text></View>
            </View>
          ))}
        </View>
      ) : (
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
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerPanel: { backgroundColor: colors.anthracite, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.xs, borderBottomWidth: 3, borderBottomColor: colors.red },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  documentNo: { color: colors.surface, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.surface, fontSize: typography.small, fontWeight: '800' },
  progressTrack: { height: 10, borderRadius: radius.sm, backgroundColor: '#30343a', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.red },
  remainingText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modeButton: { flex: 1, minHeight: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  modeActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderBottomWidth: 2, borderBottomColor: colors.red },
  modeText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  modeTextActive: { color: colors.surface },
  scanPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.sm, gap: spacing.xs },
  scanLabel: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  scanInput: { minHeight: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.anthracite, backgroundColor: colors.surfaceSoft, color: colors.ink, fontSize: typography.section, fontWeight: '900', paddingHorizontal: spacing.sm },
  scanButton: { minHeight: 42, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  scanButtonText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  listPanel: { gap: spacing.xs },
  lineRow: { minHeight: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  lineDone: { backgroundColor: colors.successSoft, borderColor: colors.success },
  checkBox: { width: 32, color: colors.anthracite, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  checkBoxDone: { color: colors.success },
  lineMain: { flex: 1, gap: 2 },
  lineCode: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  lineName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  qtyBox: { minWidth: 58, borderRadius: radius.sm, backgroundColor: colors.anthracite, paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center' },
  qtyValue: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  qtyLabel: { color: colors.surface, fontSize: 9, fontWeight: '900' },
  packingPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.sm, gap: spacing.xs },
  boxHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  boxTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  boxMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  addBoxButton: { minHeight: 32, borderRadius: radius.md, backgroundColor: colors.red, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  addBoxText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  boxTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  boxTab: { minHeight: 30, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  boxTabActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  boxTabText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  boxTabTextActive: { color: colors.surface },
  emptyBoxText: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  boxLine: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  pressed: { opacity: 0.86 },
});
