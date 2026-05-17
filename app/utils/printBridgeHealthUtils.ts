import type { PrintBridgeResult } from '../../services/api';

export type PrintBridgeHealthViewStatus = 'checking' | 'connected' | 'disconnected';

export type PrintBridgeHealthView = {
  status: PrintBridgeHealthViewStatus;
  label: string;
  message: string;
  reason?: string;
  checkedAt?: string;
};

export function formatBridgeCheckedAt(value?: string) {
  if (!value) return 'Henüz kontrol edilmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function toPrintBridgeHealthView(result: PrintBridgeResult | null, checking: boolean, checkedAt?: string): PrintBridgeHealthView {
  if (checking) {
    return {
      status: 'checking',
      label: 'Kontrol ediliyor',
      message: 'Yazdırma bilgisayarı kontrol ediliyor.',
      checkedAt,
    };
  }

  if (result?.ok) {
    return {
      status: 'connected',
      label: 'Bağlı',
      message: 'Yazdırma bilgisayarı açık ve ulaşılabilir.',
      reason: result.reason,
      checkedAt,
    };
  }

  return {
    status: 'disconnected',
    label: 'Bağlı değil',
    message: 'Yazdırma bilgisayarına ulaşılamıyor.',
    reason: result?.reason || 'Servis açık değil veya ağ bağlantısı yok.',
    checkedAt,
  };
}
