import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { addPilotFeedback, loadPilotFeedback } from '../../storage/pilotFeedbackStorage';
import type { PilotFeedbackCategory, PilotFeedbackEntry } from '../../storage/pilotFeedbackStorage';
import type { PersonnelUser } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PilotFeedbackScreenProps = {
  onBack: () => void;
  currentUser: PersonnelUser | null;
};

const categories: PilotFeedbackCategory[] = ['Satış', 'Barkod', 'Yazdırma', 'Performans', 'Kullanım Kolaylığı', 'Diğer'];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function PilotFeedbackScreen({ onBack, currentUser }: PilotFeedbackScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<PilotFeedbackCategory>('Satış');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<PilotFeedbackEntry[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'warning' } | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  const refresh = async () => {
    const savedFeedback = await loadPilotFeedback();
    setFeedback([...savedFeedback].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const summary = useMemo(() => {
    const counts = categories.reduce<Record<PilotFeedbackCategory, number>>((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<PilotFeedbackCategory, number>);
    feedback.forEach((entry) => {
      counts[entry.category] += 1;
    });
    const topCategory = [...categories].sort((first, second) => counts[second] - counts[first])[0];
    return { counts, topCategory, topCount: counts[topCategory] };
  }, [feedback]);

  const saveFeedback = async () => {
    const cleanDescription = description.trim();
    if (cleanDescription.length < 3) {
      setBanner({ message: 'Kısa açıklama yaz.', tone: 'warning' });
      notifyWarning();
      return;
    }
    await addPilotFeedback({
      category: selectedCategory,
      description: cleanDescription,
      note,
      user: currentUser,
    });
    setDescription('');
    setNote('');
    setSelectedCategory('Satış');
    setBanner({ message: 'Geri bildirim kaydedildi.', tone: 'success' });
    notifySuccess();
    await refresh();
  };

  return (
    <ScreenShell title="Pilot Geri Bildirim" subtitle="Saha notları" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.formPanel}>
        <View style={styles.formHeader}>
          <View style={styles.formTitleBlock}>
            <Text style={styles.kicker}>PERSONEL NOTU</Text>
            <Text style={styles.formTitle}>Kısa ve net yazman yeterli.</Text>
          </View>
          <StatusPill label={currentUser?.code || 'Personel'} tone="info" />
        </View>

        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={({ pressed }) => [styles.categoryButton, selectedCategory === category && styles.categoryButtonActive, pressed && styles.pressed]}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kısa açıklama</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Örn: Barkod okuyor ama ürün geç geliyor."
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ekran görüntüsü / not</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="İsteğe bağlı: ekran adı, fiş no veya kısa not."
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            multiline
          />
        </View>

        <AppButton label="GERİ BİLDİRİMİ KAYDET" onPress={saveFeedback} compact />
      </View>

      {isAdmin ? (
        <>
          <View style={styles.summaryPanel}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.kicker}>ADMIN ÖZETİ</Text>
                <Text style={styles.summaryTitle}>En sık kategori: {summary.topCount > 0 ? `${summary.topCategory} · ${summary.topCount}` : 'Yok'}</Text>
              </View>
              <StatusPill label={`${feedback.length} kayıt`} tone={feedback.length > 0 ? 'warning' : 'success'} />
            </View>
            <View style={styles.summaryGrid}>
              {categories.map((category) => (
                <View key={category} style={styles.summaryBox}>
                  <Text style={[styles.summaryValue, summary.counts[category] > 0 && styles.summaryValueActive]}>{summary.counts[category]}</Text>
                  <Text style={styles.summaryLabel}>{category}</Text>
                </View>
              ))}
            </View>
          </View>

          {feedback.length === 0 ? (
            <EmptyState badge="OK" title="Geri bildirim yok" description="Pilot kullanımda henüz kayıt bırakılmamış." />
          ) : (
            <ScrollView style={styles.feedbackList} nestedScrollEnabled>
              {feedback.map((entry) => (
                <View key={entry.id} style={styles.feedbackCard}>
                  <View style={styles.feedbackTop}>
                    <Text style={styles.feedbackCategory}>{entry.category}</Text>
                    <Text style={styles.feedbackDate}>{formatDate(entry.createdAt)}</Text>
                  </View>
                  <Text style={styles.feedbackText}>{entry.description}</Text>
                  {entry.note ? <Text style={styles.feedbackNote}>Not: {entry.note}</Text> : null}
                  <Text style={styles.feedbackMeta}>{entry.createdByName || 'Personel'} · {entry.createdByCode || '-'}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        <View style={styles.staffInfoBox}>
          <Text style={styles.staffInfoTitle}>Notun kaydedilir.</Text>
          <Text style={styles.staffInfoText}>Admin pilot sonrası tüm geri bildirimleri kategoriye göre görebilir.</Text>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  formPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  formHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  formTitleBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  formTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryButton: {
    width: '48.7%',
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  categoryButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderBottomWidth: 2, borderBottomColor: colors.red },
  categoryText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  categoryTextActive: { color: colors.surface },
  field: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: {
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    padding: spacing.sm,
    fontWeight: '800',
    textAlignVertical: 'top',
  },
  noteInput: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    padding: spacing.sm,
    fontWeight: '800',
    textAlignVertical: 'top',
  },
  summaryPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#efd5a7',
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  summaryTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summaryBox: {
    width: '31.8%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  summaryValue: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  summaryValueActive: { color: colors.amber },
  summaryLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  feedbackList: { maxHeight: 360 },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.line,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: 3,
  },
  feedbackTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  feedbackCategory: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  feedbackDate: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  feedbackText: { color: colors.ink, fontSize: typography.body, fontWeight: '800', lineHeight: 17 },
  feedbackNote: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  feedbackMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  staffInfoBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bce7c8',
    padding: spacing.sm,
    gap: 2,
  },
  staffInfoTitle: { color: colors.success, fontSize: typography.body, fontWeight: '900' },
  staffInfoText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  pressed: { opacity: 0.86 },
});
