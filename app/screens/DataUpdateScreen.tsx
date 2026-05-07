import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';

type DataUpdateScreenProps = {
  onBack: () => void;
};

export function DataUpdateScreen({ onBack }: DataUpdateScreenProps) {
  return (
    <ScreenShell title="Veri Güncelle" subtitle="Mock ürün/stok yenileme hazırlığı" onBack={onBack}>
      <InfoCard title="Kapsam" subtitle="İleride sadece ürün/stok verisi yenilenecek; açık fişler silinmeyecek." />
      <InfoCard title="Offline güvenlik" subtitle="Gönderilemeyen işlemler ve açık fiş taslakları korunacak." tone="success" />
      <AppButton label="Mock Veri Güncelle" onPress={() => undefined} />
      <InfoCard title="Bu sürümde olmayanlar" subtitle="Gerçek API çağrısı, SQL bağlantısı, Vega yazma, import, senkron veya export yoktur." tone="warning" />
    </ScreenShell>
  );
}
