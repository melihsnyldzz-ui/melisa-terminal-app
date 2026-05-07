import type { Message, OpenDocument, QRAlbum, TerminalSettings, UserSession } from '../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginMock(username: string, branch: string, offlineMode: boolean): Promise<UserSession> {
  await wait(250);
  return {
    username: username.trim() || 'Personel',
    branch,
    terminalId: 'MB-TERM-001',
    offlineMode,
  };
}

export async function getMessagesMock(): Promise<Message[]> {
  await wait(200);
  return [
    { id: 'msg-1', type: 'Acil', title: 'Acil fiş kontrolü', body: 'Açık fişte ürün fotoğrafları kontrol edilecek.', read: false, relatedDocument: 'FIS-1024', timeLabel: '09:15' },
    { id: 'msg-2', type: 'Merkez', title: 'Gün sonu notu', body: 'Kapanıştan önce açık fiş listesi kontrol edilecek.', read: false, timeLabel: '10:20' },
    { id: 'msg-3', type: 'Muhasebe', title: 'Tahsilat hazırlığı', body: 'Bu sürümde kayıt yapılmaz, sadece mesaj örneği gösterilir.', read: true, timeLabel: 'Dün' },
    { id: 'msg-4', type: 'Depo', title: 'Raf kontrolü', body: 'Barkodsuz ürünler ileride ayrı listede izlenecek.', read: true, timeLabel: 'Dün' },
    { id: 'msg-5', type: 'Fiş Notu', title: 'Müşteri fotoğraf talebi', body: 'QR albümde fiyat bilgisi gösterilmeyecek.', read: false, relatedDocument: 'FIS-1025', timeLabel: '08:40' },
  ];
}

export async function getOpenDocumentsMock(): Promise<OpenDocument[]> {
  await wait(200);
  return [
    { id: 'FIS-1024', customerName: 'Müşteri A', itemCount: 6, status: 'Açık', updatedAt: 'Bugün 09:10' },
    { id: 'FIS-1025', customerName: 'Müşteri B', itemCount: 3, status: 'Beklemede', updatedAt: 'Bugün 09:35' },
    { id: 'FIS-1026', customerName: 'Müşteri C', itemCount: 2, status: 'Gönderilemedi', updatedAt: 'Dün 18:05' },
  ];
}

export async function createSaleMock(customerName: string) {
  await wait(250);
  return {
    documentNo: 'FIS-MOCK-001',
    customerName: customerName.trim() || 'Seçili müşteri yok',
    itemCount: 0,
  };
}

export async function getQRAlbumMock(): Promise<QRAlbum> {
  await wait(200);
  return {
    documentNo: 'FIS-1024',
    customerLabel: 'Müşteri A',
    items: [
      { id: 'p-1', name: 'Kız Çocuk Elbise', color: 'Kırmızı', size: '4 Yaş' },
      { id: 'p-2', name: 'Bebek Takım', color: 'Beyaz', size: '12 Ay' },
      { id: 'p-3', name: 'Çocuk Mont', color: 'Siyah', size: '6 Yaş' },
    ],
  };
}

export async function testConnectionMock(settings: TerminalSettings) {
  await wait(300);
  return {
    ok: true,
    message: `${settings.terminalId} için mock bağlantı kontrolü hazır.`,
  };
}
