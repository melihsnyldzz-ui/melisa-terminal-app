import type { FailedOperation, Message, OpenDocument, Product, QRAlbum, TerminalSettings, UserSession } from '../types';
import { loadSettings } from '../storage/localStorage';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const LOCAL_PRICE_TIMEOUT_MS = 1800;

const productTemplates: Product[] = [
  { code: 'MB-1001', name: 'Bebek Takım', price: 485 },
  { code: 'MB-1002', name: 'Hastane Çıkışı', price: 620 },
  { code: 'MB-1003', name: 'Tulum', price: 295 },
  { code: 'MB-1004', name: 'Zıbın Seti', price: 210 },
  { code: 'MB-1005', name: 'Çocuk Elbise', price: 540 },
  { code: 'MB-1006', name: 'Kapitone Yelek', price: 390 },
  { code: 'MB-1007', name: 'Organik Body Set', price: 330 },
  { code: 'MB-1008', name: 'Kız Bebek Takım', price: 575 },
];

function getMockProductFallback(code: string): Product {
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

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed.replace(/\/+$/, '');
}

type LocalPriceServiceResponse = {
  found?: boolean;
  code?: string;
  name?: string;
  price?: number;
  currency?: string;
};

type LocalPriceLookupResult =
  | { status: 'found'; product: Product }
  | { status: 'not-found' }
  | { status: 'invalid-url' }
  | { status: 'service-unavailable' };

async function getProductFromLocalPriceService(code: string, apiBaseUrl: string): Promise<LocalPriceLookupResult> {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!baseUrl) return { status: 'invalid-url' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_PRICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/product-price?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'service-unavailable' };

    const payload = (await response.json()) as LocalPriceServiceResponse;
    if (!payload.found || !payload.name || typeof payload.price !== 'number') return { status: 'not-found' };

    return {
      status: 'found',
      product: {
        code: (payload.code || code).trim().toUpperCase(),
        name: payload.name,
        price: payload.price,
        currency: payload.currency,
      },
    };
  } catch {
    return { status: 'service-unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

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
    { id: 'msg-6', type: 'Fiş Notu', sender: 'Sevkiyat', title: 'Nova Baby paket notu', body: 'FIS-1027 için ürünler ayrı poşetlenip müşteri adına göre etiketlenecek.', read: false, relatedDocument: 'FIS-1027', timeLabel: '11:05' },
    { id: 'msg-7', type: 'Depo', sender: 'Depo', title: 'Yeni sezon rafı', body: 'Kapitone yelek ve organik body setleri ön raf mock kontrolüne alındı.', read: true, timeLabel: '11:20' },
  ];
}

export async function getOpenDocumentsMock(): Promise<OpenDocument[]> {
  await wait(200);
  return [
    { id: 'FIS-1024', customerName: 'ABC Baby Store', itemCount: 8, status: 'Açık', updatedAt: 'Bugün 09:10' },
    { id: 'FIS-1025', customerName: 'Merkez müşteri', itemCount: 3, status: 'Beklemede', updatedAt: 'Bugün 09:35' },
    { id: 'FIS-1026', customerName: 'Depo teslim', itemCount: 2, status: 'Gönderilemedi', updatedAt: 'Dün 18:05' },
    { id: 'FIS-1027', customerName: 'Nova Baby', itemCount: 11, status: 'Açık', updatedAt: 'Bugün 11:05' },
    { id: 'FIS-1028', customerName: 'Bebek Dünyası', itemCount: 5, status: 'Beklemede', updatedAt: 'Bugün 11:40' },
    { id: 'FIS-1029', customerName: 'Happy Mini Store', itemCount: 7, status: 'Açık', updatedAt: 'Bugün 12:15' },
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

export async function getMockProductByCode(code: string): Promise<Product | null> {
  await wait(120);
  const normalizedCode = code.trim().toUpperCase();
  const settings = await loadSettings();

  if (settings.apiMode === 'mock') {
    return getMockProductFallback(normalizedCode);
  }

  const serviceResult = await getProductFromLocalPriceService(normalizedCode, settings.apiBaseUrl);
  if (serviceResult.status === 'found') return serviceResult.product;

  if (settings.apiMode === 'real') {
    if (serviceResult.status === 'invalid-url') throw new Error('API adresi geçersiz');
    if (serviceResult.status === 'service-unavailable') throw new Error('Local fiyat servisi bağlı değil');
    return null;
  }

  return getMockProductFallback(normalizedCode);
}

export async function getQRAlbumMock(): Promise<QRAlbum> {
  await wait(200);
  return {
    documentNo: 'FIS-1024',
    customerLabel: 'ABC Baby Store',
    status: 'Hazır',
    items: [
      { id: 'p-1', code: 'MB-ELB-104', name: 'Kız Çocuk Elbise' },
      { id: 'p-2', code: 'MB-TKM-212', name: 'Bebek Takım' },
      { id: 'p-3', code: 'MB-MNT-306', name: 'Çocuk Mont' },
      { id: 'p-4', code: 'MB-ZBN-118', name: 'Zıbın Seti' },
    ],
  };
}

export async function getFailedOperationsMock(): Promise<FailedOperation[]> {
  await wait(200);
  return [
    {
      id: 'fail-1',
      documentNo: 'FIS-1026',
      operationType: 'Fiş gönderimi',
      title: 'Fiş gönderimi bekliyor',
      reason: 'Bağlantı hazırlık aşamasında olduğu için kuyrukta tutuluyor.',
      createdAt: 'Dün 18:05',
      status: 'Gönderilemedi',
    },
    {
      id: 'fail-2',
      documentNo: 'FIS-1028',
      operationType: 'QR albüm hazırlığı',
      title: 'QR albüm tekrar denenecek',
      reason: 'Mock bağlantı gecikmesi nedeniyle işlem kuyrukta tutuluyor.',
      createdAt: 'Bugün 11:42',
      status: 'Gönderilemedi',
    },
  ];
}

export async function testConnectionMock(settings: TerminalSettings) {
  await wait(300);
  if (settings.apiMode === 'mock') {
    return { ok: true, message: 'Servis yok, mock sistem kullanılacak' };
  }

  const baseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);
  const ready = Boolean(settings.terminalId.trim());
  if (!ready) {
    return {
      ok: false,
      message: 'Bağlantı bekliyor',
    };
  }
  if (!baseUrl) {
    return { ok: false, message: 'API adresi geçersiz' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_PRICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/health`, { method: 'GET', signal: controller.signal });
    if (!response.ok) {
      return {
        ok: settings.apiMode === 'fallback',
        message: settings.apiMode === 'fallback' ? 'Servis yok, mock sistem kullanılacak' : 'Local fiyat servisi bağlı değil',
      };
    }
    return { ok: true, message: 'Local fiyat servisi bağlı' };
  } catch {
    return {
      ok: settings.apiMode === 'fallback',
      message: settings.apiMode === 'fallback' ? 'Servis yok, mock sistem kullanılacak' : 'Local fiyat servisi bağlı değil',
    };
  } finally {
    clearTimeout(timeout);
  }
}
