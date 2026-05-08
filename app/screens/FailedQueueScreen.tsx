import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getFailedOperationsMock } from '../../services/api';
import { loadFailedOperationsSnapshot, saveFailedOperations } from '../../storage/localStorage';
import type { FailedOperation } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type FailedQueueScreenProps = {
  onBack: () => void;
};

export function FailedQueueScreen({ onBack }: FailedQueueScreenProps) {
  const [operations, setOperations] = useState<FailedOperation[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const savedOperations = await loadFailedOperationsSnapshot();
    if (savedOperations) {
      setOperations(savedOperations);
      return;
    }

    const initialOperations = await getFailedOperationsMock();
    await saveFailedOperations(initialOperations);
    setOperations(initialOperations);
  };

  const retryOperation = async (operation: FailedOperation) => {
    const nextOperations = operations.filter((item) => item.id !== operation.id);
    setOperations(nextOperations);
    await saveFailedOperations(nextOperations);
    setBanner({ message: `${operation.documentNo} için tekrar deneme başarılı.`, tone: 'success' });
  };

  const retryAll = async () => {
    setOperations([]);
    await saveFailedOperations([]);
    setBanner({ message: 'Bekleyen tüm işlemler başarıyla tekrar denendi.', tone: 'success' });
  };

  return (
    <ScreenShell title="Gönderilemeyenler" subtitle={`${operations.length} bekleyen işlem`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      {operations.length > 0 ? (
        <View style={styles.topPanel}>
          <View>
            <Text style={styles.topTitle}>Offline kuyruk</Text>
            <Text style={styles.topText}>Bağlantı hazır olduğunda işlemler yeniden gönderilir.</Text>
          </View>
          <ActionRow actions={[{ label: 'Tümünü Tekrar Dene', onPress: retryAll, variant: 'primary' }]} />
        </View>
      ) : null}

      {operations.length === 0 ? (
        <EmptyState badge="OK" title="Bekleyen işlem yok" description="Tüm işlemler güncel." />
      ) : (
        operations.map((operation) => (
          <View key={operation.id} style={styles.queueCard}>
            <View style={styles.cardAccent} />
            <View style={styles.cardTop}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.documentNo}>{operation.documentNo}</Text>
                <Text style={styles.operationType}>{operation.operationType}</Text>
              </View>
              <StatusPill label={operation.status} tone={statusToneFor(operation.status)} />
            </View>

            <Text style={styles.title}>{operation.title}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Sebep" value={operation.reason} />
              <InfoItem label="Saat" value={operation.createdAt} />
            </View>

            <Pressable onPress={() => retryOperation(operation)} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScreenShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  topTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  topText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', marginTop: 2 },
  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.red },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitleBlock: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  operationType: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  title: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  infoGrid: { gap: spacing.xs },
  infoItem: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  retryButton: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: colors.redDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  retryText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
