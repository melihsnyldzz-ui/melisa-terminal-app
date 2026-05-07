import { useEffect, useState } from 'react';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { loadFailedOperations, saveFailedOperations } from '../../storage/localStorage';
import type { FailedOperation } from '../../types';

type FailedQueueScreenProps = {
  onBack: () => void;
};

const fallbackOperations: FailedOperation[] = [
  {
    id: 'fail-1',
    title: 'FIS-1026 gönderilemedi',
    reason: 'Mock senkron kuyruğu örneği',
    createdAt: 'Dün 18:05',
  },
];

export function FailedQueueScreen({ onBack }: FailedQueueScreenProps) {
  const [operations, setOperations] = useState<FailedOperation[]>([]);

  useEffect(() => {
    loadFailedOperations().then(async (saved) => {
      if (saved.length > 0) {
        setOperations(saved);
        return;
      }
      await saveFailedOperations(fallbackOperations);
      setOperations(fallbackOperations);
    });
  }, []);

  return (
    <ScreenShell title="Gönderilemeyenler" subtitle="Mock local kuyruk" onBack={onBack}>
      {operations.map((operation) => (
        <InfoCard key={operation.id} title={operation.title} subtitle={`${operation.reason} · ${operation.createdAt}`} tone="danger" />
      ))}
      <InfoCard title="Offline ilke" subtitle="Bekleyen belge kaybolmamalıdır. Bu v0.1 ekranı sadece mock kuyruk gösterir." tone="warning" />
    </ScreenShell>
  );
}
