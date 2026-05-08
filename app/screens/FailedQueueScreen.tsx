import { useEffect, useState } from 'react';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getFailedOperationsMock } from '../../services/api';
import type { FailedOperation } from '../../types';

type FailedQueueScreenProps = {
  onBack: () => void;
};

export function FailedQueueScreen({ onBack }: FailedQueueScreenProps) {
  const [operations, setOperations] = useState<FailedOperation[]>([]);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getFailedOperationsMock().then(setOperations);
  }, []);

  return (
    <ScreenShell title="Gönderilemeyenler" subtitle="Offline kuyruk ve tekrar deneme ekranı" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      {operations.length === 0 ? (
        <EmptyState badge="OK" title="Kuyruk temiz" description="Gönderilemeyen işlem bulunmuyor. Açık fişler local olarak korunur." />
      ) : (
        operations.map((operation) => (
          <InfoCard key={operation.id} title={operation.title} subtitle={`${operation.documentNo} · ${operation.createdAt}`} tone="danger">
            <StatusPill label="Gönderilemedi" tone="danger" />
            <InfoCard title="Neden" subtitle={operation.reason} />
            <ActionRow actions={[{ label: 'Tekrar Dene', onPress: () => setBanner({ message: `${operation.documentNo} tekrar deneme mock kuyruğuna alındı.`, tone: 'warning' }), variant: 'primary' }]} />
          </InfoCard>
        ))
      )}
    </ScreenShell>
  );
}
