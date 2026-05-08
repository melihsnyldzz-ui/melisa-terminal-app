import type { FailedOperation, Message, OpenDocument, Product, QRAlbum, TerminalSettings, UserSession } from '../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const productTemplates: Product[] = [
  { code: 'MB-1001', name: 'Bebek Takım', color: 'Pembe', size: '6-9 Ay' },
  { code: 'MB-1002', name: 'Hastane Çıkışı', color: 'Ekru', size: '0-3 Ay' },
  { code: 'MB-1003', name: 'Tulum', color: 'Mavi', size: '9-12 Ay' },
  { code: 'MB-1004', name: 'Zıbın Seti', color: 'Beyaz', size: '3-6 Ay' },
  { code: 'MB-1005', name: 'Çocuk Elbise', color: 'Kırmızı', size: '4 Yaş' },
];

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
    { id: 'msg-1', type: 'Acil', sender: 'Merkez', title: 'Acil fiş kontrolü', body: 'FIS-1024 içindeki ürün görselleri müşteriye gitmeden kontrol edilecek.', read: false, relatedDocument: 'FIS-1024', timeLabel: '09:15' },
    { id: 'msg-2', type: 'Merkez', sender: 'Operasyon', title: 'Gün sonu notu', body: 'Kapanıştan önce açık fiş ve gönderilemeyenler listesi kontrol edilecek.', read: false, timeLabel: '10:20' },
    { id: 'msg-3', type: 'Muhasebe', sender: 'Muhasebe', title: 'Tahsilat hazırlığı', body: 'Bu sürümde kayıt yapılmaz; finans bilgisi sadece ileriki onaylı fazda ele alınacak.', read: true, timeLabel: 'Dün' },
    { id: 'msg-4', type: 'Depo', sender: 'Depo', title: 'Raf kontrolü', body: 'Barkodsuz ürünler için hazırlık listesi ayrıca doğrulanacak.', read: true, timeLabel: 'Dün' },
    { id: 'msg-5', type: 'Fiş Notu', sender: 'Satış', title: 'Müşteri fotoğraf talebi', body: 'QR albümde fiyat bilgisi gösterilmeyecek; sadece ürün görselleri paylaşılacak.', read: false, relatedDocument: 'FIS-1025', timeLabel: '08:40' },
  ];
}

export async function getOpenDocumentsMock(): Promise<OpenDocument[]> {
  await wait(200);
  return [
    { id: 'FIS-1024', customerName: 'ABC Baby Store', itemCount: 8, status: 'Açık', updatedAt: 'Bugün 09:10' },
    { id: 'FIS-1025', customerName: 'Merkez müşteri', itemCount: 3, status: 'Beklemede', updatedAt: 'Bugün 09:35' },
    { id: 'FIS-1026', customerName: 'Depo teslim', itemCount: 2, status: 'Gönderilemedi', updatedAt: 'Dün 18:05' },
  ];
}

export async function createSaleMock(customerName: string) {
  await wait(250);
  const suffix = Date.now().toString().slice(-5);
  return {
    documentNo: `FIS-${suffix}`,
    customerName: customerName.trim() || 'Seçili müşteri yok',
    itemCount: 0,
  };
}

export async function getMockProductByCode(code: string): Promise<Product> {
  await wait(120);
  const normalizedCode = code.trim().toUpperCase();
  const knownProduct = productTemplates.find((product) => product.code === normalizedCode);
  if (knownProduct) return knownProduct;

  const index = Math.abs([...normalizedCode].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % productTemplates.length;
  const product = productTemplates[index];
  return {
    ...product,
    code: normalizedCode || product.code,
  };
}

export async function getQRAlbumMock(): Promise<QRAlbum> {
  await wait(200);
  return {
    documentNo: 'FIS-1024',
    customerLabel: 'ABC Baby Store',
    status: 'Hazır',
    items: [
      { id: 'p-1', code: 'MB-ELB-104', name: 'Kız Çocuk Elbise', color: 'Kırmızı', size: '4 Yaş' },
      { id: 'p-2', code: 'MB-TKM-212', name: 'Bebek Takım', color: 'Beyaz', size: '12 Ay' },
      { id: 'p-3', code: 'MB-MNT-306', name: 'Çocuk Mont', color: 'Siyah', size: '6 Yaş' },
      { id: 'p-4', code: 'MB-ZBN-118', name: 'Zıbın Seti', color: 'Ekru', size: '6 Ay' },
    ],
  };
}

export async function getFailedOperationsMock(): Promise<FailedOperation[]> {
  await wait(200);
  return [
    {
      id: 'fail-1',
      documentNo: 'FIS-1026',
      title: 'Fiş gönderimi bekliyor',
      reason: 'Bağlantı hazırlık aşamasında olduğu için kuyrukta tutuluyor.',
      createdAt: 'Dün 18:05',
    },
  ];
}

export async function testConnectionMock(settings: TerminalSettings) {
  await wait(300);
  const ready = Boolean(settings.terminalId.trim() && settings.apiBaseUrl.trim());
  return {
    ok: ready,
    message: ready ? 'Bağlantı kontrolü başarılı' : 'Bağlantı bekliyor',
  };
}
