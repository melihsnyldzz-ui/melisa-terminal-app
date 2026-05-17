import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { clearOfflineActions, loadOfflineActions } from '../../storage/offlineQueueStorage';
import { clearPilotFeedback, loadPilotFeedback } from '../../storage/pilotFeedbackStorage';
import { clearPrintEvents, loadPrintEvents } from '../../storage/printEventStorage';
import { clearPilotIssueAuditLogs, clearTestSaleDrafts, loadActiveSaleDraft, loadAuditLogs, loadSaleDrafts } from '../../storage/localStorage';
import type { ActiveSaleDraft, AuditLogEntry } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type PilotDataCleanupScreenProps = {
  onBack: () => void;
};

type CleanupSummary = {
  feedback: number;
  pilotIssueAuditLogs: number;
  printEvents: number;
  offlineActions: number;
  testSaleDrafts: number;
};

const emptySummary: CleanupSummary = {
  feedback: 0,
  pilotIssueAuditLogs: 0,
  printEvents: 0,
  offlineActions: 0,
  testSaleDrafts: 0,
};

const isTestSaleDraft = (draft: ActiveSaleDraft): boolean => {
  const source = `${draft.documentNo || ''} ${draft.customerName || ''} ${draft.status || ''}`.toLocaleLowerCase('tr-TR');
  return source.includes('test') || source.includes('deneme') || source.includes('pilot');
};

const isPilotIssueAuditLog = (log: AuditLogEntry): boolean => {
  const source = `${log.operationType} ${log.description}`.toLocaleLowerCase('tr-TR');
  return source.includes('bulunamadı')
    || source.includes('urun bulunamadi')
    || source.includes('ürün bulunamadı')
    || source.includes('fiyat')
    || source.includes('hata')
    || log.status === 'error';
};

export function PilotDataCleanupScreen({ onBack }: PilotDataCleanupScreenProps) {
  const [summary, setSummary] = useState<CleanupSummary>(emptySummary);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'warning' } | null>(null);

  const refresh = async () => {
    const [feedback, auditLogs, printEvents, offlineActions, saleDrafts, activeDraft] = await Promise.all([
      loadPilotFeedback(),
      loadAuditLogs(),
      loadPrintEvents(),
      loadOfflineActions(),
      loadSaleDrafts(),
      loadActiveSaleDraft(),
    ]);
    const testDraftNos = new Set(saleDrafts.filter(isTestSaleDraft).map((draft) => draft.documentNo));
    if (activeDraft && isTestSaleDraft(activeDraft)) testDraftNos.add(activeDraft.documentNo);
    setSummary({
      feedback: feedback.length,
      pilotIssueAuditLogs: auditLogs.filter(isPilotIssueAuditLog).length,
      printEvents: printEvents.length,
      offlineActions: offlineActions.length,
      testSaleDrafts: testDraftNos.size,
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const totalPilotItems = useMemo(
    () => summary.feedback + summary.pilotIssueAuditLogs + summary.printEvents + summary.offlineActions + summary.testSaleDrafts,
    [summary],
  );

  const runCleanup = async (message: string, action: () => Promise<void>) => {
    await action();
    setBanner({ message, tone: 'success' });
    notifySuccess();
    await refresh();
  };

  const confirmCleanup = (title: string, message: string, action: () => Promise<void>, successMessage: string) => {
    Alert.alert(
      title,
      `${message}\n\nBu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            void runCleanup(successMessage, action);
          },
        },
      ],
    );
  };

  const confirmClearAll = () => {
    Alert.alert(
      'Tüm pilot test verileri',
      'Pilot geri bildirimleri, pilot hata kayıtları, yazdırma olay geçmişi, offline queue ve test satış taslakları temizlenecek.\n\nTerminal ayarları, personel, API adresi ve kur ayarları korunur.\n\nBu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam Et',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Son onay',
              'Emin misin? Tüm pilot test verileri temizlenecek. Gerçek satış verisi riski olan alanlarda sadece TEST / DENEME / PILOT görünen taslaklar silinir.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Evet, Temizle',
                  style: 'destructive',
                  onPress: () => {
                    void runCleanup('Pilot test verileri temizlendi.', async () => {
                      await Promise.all([
                        clearPilotFeedback(),
                        clearPilotIssueAuditLogs(),
                        clearPrintEvents(),
                        clearOfflineActions(),
                        clearTestSaleDrafts(),
                      ]);
                    });
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const showProtectedWarning = () => {
    setBanner({ message: 'Canlı ayarlar korunur: terminal, personel, API adresi ve kur ayarları silinmez.', tone: 'warning' });
    notifyWarning();
  };

  return (
    <ScreenShell title="Pilot Veri Temizleme" subtitle={`${totalPilotItems} temizlenebilir kayıt`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.warningPanel}>
        <View style={styles.warningTop}>
          <View style={styles.warningTextBlock}>
            <Text style={styles.kicker}>GÜVENLİ TEMİZLEME</Text>
            <Text style={styles.warningTitle}>Sadece pilot/test kayıtları hedeflenir.</Text>
          </View>
          <StatusPill label="Admin" tone="warning" />
        </View>
        <Text style={styles.warningText}>Terminal ayarları, personel listesi, API adresi ve kur ayarları bu ekrandan silinmez. Test satış taslaklarında sadece adı veya fiş numarası TEST / DENEME / PILOT görünen kayıtlar temizlenir.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <InfoBox label="Geri bildirim" value={summary.feedback.toString()} />
        <InfoBox label="Pilot hata" value={summary.pilotIssueAuditLogs.toString()} tone={summary.pilotIssueAuditLogs > 0 ? 'warning' : 'success'} />
        <InfoBox label="Print geçmişi" value={summary.printEvents.toString()} />
        <InfoBox label="Offline queue" value={summary.offlineActions.toString()} tone={summary.offlineActions > 0 ? 'warning' : 'success'} />
        <InfoBox label="Test taslak" value={summary.testSaleDrafts.toString()} tone={summary.testSaleDrafts > 0 ? 'warning' : 'success'} />
      </View>

      <View style={styles.actionsPanel}>
        <CleanupRow
          title="Pilot geri bildirimleri temizle"
          description="Personelin pilot sırasında bıraktığı geri bildirim notlarını siler."
          count={summary.feedback}
          onPress={() => confirmCleanup('Geri bildirimleri temizle', 'Tüm pilot geri bildirimleri silinsin mi?', clearPilotFeedback, 'Pilot geri bildirimleri temizlendi.')}
        />
        <CleanupRow
          title="Pilot hata/olay kayıtlarını temizle"
          description="Barkod, fiyat ve hata içerikli pilot audit kayıtlarını temizler. Tüm audit log silinmez."
          count={summary.pilotIssueAuditLogs}
          onPress={() => confirmCleanup('Pilot hata kayıtları', 'Pilot hata/olay audit kayıtları silinsin mi?', clearPilotIssueAuditLogs, 'Pilot hata/olay kayıtları temizlendi.')}
        />
        <CleanupRow
          title="Yazdırma geçmişini temizle"
          description="Yazdırma olay defterini temizler. Yazıcı ayarlarına dokunmaz."
          count={summary.printEvents}
          onPress={() => confirmCleanup('Yazdırma geçmişi', 'Yazdırma olay geçmişi silinsin mi?', clearPrintEvents, 'Yazdırma geçmişi temizlendi.')}
        />
        <CleanupRow
          title="Offline queue temizle"
          description="Bekleyen veya hatalı offline işlemleri temizler. Gerçek sync çalıştırmaz."
          count={summary.offlineActions}
          onPress={() => confirmCleanup('Offline queue', 'Offline queue kayıtları silinsin mi?', clearOfflineActions, 'Offline queue temizlendi.')}
        />
        <CleanupRow
          title="Test satış taslaklarını temizle"
          description="Sadece TEST / DENEME / PILOT görünen satış taslaklarını siler."
          count={summary.testSaleDrafts}
          onPress={() => confirmCleanup('Test satış taslakları', 'Test satış taslakları silinsin mi? Gerçek satış gibi görünen taslaklar korunur.', clearTestSaleDrafts, 'Test satış taslakları temizlendi.')}
        />
      </View>

      <View style={styles.bulkPanel}>
        <Text style={styles.bulkTitle}>Toplu temizleme</Text>
        <Text style={styles.bulkText}>Bu işlem iki kez onay ister. Kritik canlı ayarlar korunur, test satış taslaklarında sadece açıkça test/deneme/pilot görünen kayıtlar silinir.</Text>
        <AppButton label="Tüm pilot test verilerini temizle" onPress={confirmClearAll} variant="dark" compact />
        <AppButton label="Korunan ayarları göster" onPress={showProtectedWarning} variant="quiet" compact />
      </View>
    </ScreenShell>
  );
}

function CleanupRow({ title, description, count, onPress }: { title: string; description: string; count: number; onPress: () => void }) {
  return (
    <View style={styles.cleanupRow}>
      <View style={styles.cleanupTextBlock}>
        <Text style={styles.cleanupTitle}>{title}</Text>
        <Text style={styles.cleanupDescription}>{description}</Text>
      </View>
      <View style={styles.cleanupSide}>
        <StatusPill label={`${count} kayıt`} tone={count > 0 ? 'warning' : 'success'} />
        <AppButton label="Temizle" onPress={onPress} variant="secondary" compact />
      </View>
    </View>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' }) {
  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoValue, tone === 'success' && styles.infoSuccess, tone === 'warning' && styles.infoWarning]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warningPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#efd5a7',
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  warningTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  warningTextBlock: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  warningTitle: { color: colors.amber, fontSize: typography.body, fontWeight: '900', lineHeight: 17 },
  warningText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  infoBox: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoValue: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900' },
  infoSuccess: { color: colors.success },
  infoWarning: { color: colors.amber },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  actionsPanel: { gap: spacing.xs },
  cleanupRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cleanupTextBlock: { flex: 1, gap: 2 },
  cleanupTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  cleanupDescription: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  cleanupSide: { width: 116, gap: spacing.xs },
  bulkPanel: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#f3bcc5',
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bulkTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  bulkText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
