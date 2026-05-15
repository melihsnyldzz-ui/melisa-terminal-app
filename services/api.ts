import type { FailedOperation, Message, OpenDocument, Product, QRAlbum, TerminalSettings, UserSession } from '../types';
import { loadSettings } from '../storage/localStorage';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const LOCAL_PRICE_TIMEOUT_MS = 1800;
const HEALTH_ENDPOINTS = ['/health', '/status', '/'];

const productTemplates: Product[] = [
  { code: 'MB-1001', name: 'Bebek Takim', price: 485, currency: 'TL' },
  { code: 'MB-1002', name: 'Hastane Cikisi', price: 620, currency: 'TL' },
  { code: 'MB-1003', name: 'Tulum', price: 295, currency: 'TL' },
  { code: 'MB-1004', name: 'Zibin Seti', price: 210, currency: 'TL' },
  { code: 'MB-1005', name: 'Cocuk Elbise', price: 540, currency: 'TL' },
  { code: 'MB-1006', name: 'Kapitone Yelek', price: 390, currency: 'TL' },
  { code: 'MB-1007', name: 'Organik Body Set', price: 330, currency: 'TL' },
  { code: 'MB-1008', name: 'Kiz Bebek Takim', price: 575, currency: 'TL' },
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
  if (!/^http:\/\//i.test(trimmed)) return '';
  return trimmed.replace(/\/+$/, '');
}

function getLoopbackReason(baseUrl: string) {
  try {
    const { hostname } = new URL(baseUrl);
    if (['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())) {
      return 'Android cihazda localhost bilgisayari degil cihazin kendisini gosterir. PC IPv4 adresini yazin.';
    }
  } catch {
    return 'API adresi gecersiz.';
  }
  return '';
}

type LocalPriceServiceResponse = {
  found?: boolean;
  code?: string;
  name?: string;
  price?: number | string;
  currency?: string;
  message?: string;
};

type LocalPriceLookupResult =
  | { status: 'found'; product: Product }
  | { status: 'not-found'; reason: string }
  | { status: 'invalid-url'; reason: string }
  | { status: 'service-unavailable'; reason: string };

export type LocalPriceConnectionResult = {
  ok: boolean;
  message: string;
  url: string;
  endpoint?: string;
  reason?: string;
};

async function getProductFromLocalPriceService(code: string, apiBaseUrl: string): Promise<LocalPriceLookupResult> {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!baseUrl) return { status: 'invalid-url', reason: 'API adresi gecersiz. Adres http://192.168.1.45:8787 formatinda olmali.' };

  const loopbackReason = getLoopbackReason(baseUrl);
  if (loopbackReason) return { status: 'invalid-url', reason: loopbackReason };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_PRICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/product-price?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'service-unavailable', reason: `${baseUrl}/product-price HTTP ${response.status}` };

    const payload = (await response.json()) as LocalPriceServiceResponse;
    const price = typeof payload.price === 'number' ? payload.price : Number(payload.price);

    if (!payload.found) return { status: 'not-found', reason: payload.message || 'Urun bulunamadi' };
    if (!payload.name || !Number.isFinite(price)) return { status: 'not-found', reason: `${code} icin urun bulunamadi` };

    return {
      status: 'found',
      product: {
        code: String(payload.code || code).trim().toUpperCase(),
        name: payload.name,
        price,
        currency: payload.currency || 'TL',
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Baglanti hatasi';
    const cleartextHint = reason.toLowerCase().includes('network request failed')
      ? ' Android cleartext/LAN erisim hatasi olabilir. Chrome calisiyorsa APK network security config kontrol edilmeli.'
      : '';
    return { status: 'service-unavailable', reason: `${baseUrl}/product-price erisilemedi: ${reason}.${cleartextHint}` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkLocalPriceService(settings: TerminalSettings): Promise<LocalPriceConnectionResult> {
  const baseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);
  if (!baseUrl) {
    return {
      ok: false,
      url: settings.apiBaseUrl,
      message: 'API adresi gecersiz',
      reason: 'Adres http://192.168.1.45:8787 formatinda olmali.',
    };
  }

  const loopbackReason = getLoopbackReason(baseUrl);
  if (loopbackReason) {
    return {
      ok: false,
      url: baseUrl,
      message: `Local fiyat servisi bagli degil: ${baseUrl}`,
      reason: loopbackReason,
    };
  }

  let lastReason = 'Yanit alinamadi';
  for (const endpoint of HEALTH_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOCAL_PRICE_TIMEOUT_MS);
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      const healthOk = endpoint === '/health' && response.ok && Boolean((payload as { ok?: boolean } | null)?.ok);
      const fallbackOk = endpoint !== '/health' && (response.ok || text.trim().length > 0);
      if (healthOk || fallbackOk) {
        return {
          ok: true,
          url: baseUrl,
          endpoint,
          message: 'Local fiyat servisi bağlı - Vega fiyat okuma hazır',
        };
      }

      lastReason = endpoint === '/health' ? `${url} HTTP 200 veya ok:true donmedi` : `${url} bos yanit dondu`;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Baglanti hatasi';
      const cleartextHint = reason.toLowerCase().includes('network request failed')
        ? ' Android cleartext/LAN erisim hatasi olabilir. Chrome calisiyorsa APK network security config kontrol edilmeli.'
        : '';
      lastReason = `${url} erisilemedi: ${reason}.${cleartextHint}`;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    url: baseUrl,
    message: `Local fiyat servisi bagli degil: ${baseUrl}`,
    reason: lastReason,
  };
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
    { id: 'msg-1', type: 'Acil', sender: 'Merkez', title: 'Acil fis kontrolu', body: 'FIS-1024 icindeki urun gorselleri musteriyi gitmeden kontrol edilecek.', read: false, relatedDocument: 'FIS-1024', timeLabel: '09:15' },
    { id: 'msg-2', type: 'Merkez', sender: 'Operasyon', title: 'Gun sonu notu', body: 'Kapanistan once acik fis ve gonderilemeyenler listesi kontrol edilecek.', read: false, timeLabel: '10:20' },
    { id: 'msg-3', type: 'Muhasebe', sender: 'Muhasebe', title: 'Tahsilat hazirligi', body: 'Bu surumde kayit yapilmaz; finans bilgisi sadece ileriki onayli fazda ele alinacak.', read: true, timeLabel: 'Dun' },
    { id: 'msg-4', type: 'Depo', sender: 'Depo', title: 'Raf kontrolu', body: 'Barkodsuz urunler icin hazirlik listesi ayrica dogrulanacak.', read: true, timeLabel: 'Dun' },
    { id: 'msg-5', type: 'Fiş Notu', sender: 'Satis', title: 'Musteri fotograf talebi', body: 'QR albumde fiyat bilgisi gosterilmeyecek; sadece urun gorselleri paylasilacak.', read: false, relatedDocument: 'FIS-1025', timeLabel: '08:40' },
    { id: 'msg-6', type: 'Fiş Notu', sender: 'Sevkiyat', title: 'Nova Baby paket notu', body: 'FIS-1027 icin urunler ayri posetlenip musteri adina gore etiketlenecek.', read: false, relatedDocument: 'FIS-1027', timeLabel: '11:05' },
    { id: 'msg-7', type: 'Depo', sender: 'Depo', title: 'Yeni sezon rafi', body: 'Kapitone yelek ve organik body setleri on raf mock kontrolune alindi.', read: true, timeLabel: '11:20' },
  ];
}

export async function getOpenDocumentsMock(): Promise<OpenDocument[]> {
  await wait(200);
  return [
    { id: 'FIS-1024', customerName: 'ABC Baby Store', itemCount: 8, status: 'Açık', updatedAt: 'Bugun 09:10' },
    { id: 'FIS-1025', customerName: 'Merkez musteri', itemCount: 3, status: 'Beklemede', updatedAt: 'Bugun 09:35' },
    { id: 'FIS-1026', customerName: 'Depo teslim', itemCount: 2, status: 'Gönderilemedi', updatedAt: 'Dun 18:05' },
    { id: 'FIS-1027', customerName: 'Nova Baby', itemCount: 11, status: 'Açık', updatedAt: 'Bugun 11:05' },
    { id: 'FIS-1028', customerName: 'Bebek Dunyasi', itemCount: 5, status: 'Beklemede', updatedAt: 'Bugun 11:40' },
    { id: 'FIS-1029', customerName: 'Happy Mini Store', itemCount: 7, status: 'Açık', updatedAt: 'Bugun 12:15' },
  ];
}

export async function createSaleMock(customerName: string) {
  await wait(250);
  const suffix = Date.now().toString().slice(-5);
  return {
    documentNo: `FIS-${suffix}`,
    customerName: customerName.trim() || 'Secili musteri yok',
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
    if (serviceResult.status === 'invalid-url') throw new Error(`${serviceResult.reason} Adres: ${settings.apiBaseUrl}`);
    if (serviceResult.status === 'service-unavailable') throw new Error(`Local fiyat servisi bagli degil. Adres: ${settings.apiBaseUrl}. Neden: ${serviceResult.reason}`);
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
      { id: 'p-1', code: 'MB-ELB-104', name: 'Kiz Cocuk Elbise' },
      { id: 'p-2', code: 'MB-TKM-212', name: 'Bebek Takim' },
      { id: 'p-3', code: 'MB-MNT-306', name: 'Cocuk Mont' },
      { id: 'p-4', code: 'MB-ZBN-118', name: 'Zibin Seti' },
    ],
  };
}

export async function getFailedOperationsMock(): Promise<FailedOperation[]> {
  await wait(200);
  return [
    {
      id: 'fail-1',
      documentNo: 'FIS-1026',
      operationType: 'Fis gonderimi',
      title: 'Fis gonderimi bekliyor',
      reason: 'Baglanti hazirlik asamasinda oldugu icin kuyrukta tutuluyor.',
      createdAt: 'Dun 18:05',
      status: 'Gönderilemedi',
    },
    {
      id: 'fail-2',
      documentNo: 'FIS-1028',
      operationType: 'QR album hazirligi',
      title: 'QR album tekrar denenecek',
      reason: 'Mock baglanti gecikmesi nedeniyle islem kuyrukta tutuluyor.',
      createdAt: 'Bugun 11:42',
      status: 'Gönderilemedi',
    },
  ];
}

export async function testConnectionMock(settings: TerminalSettings) {
  await wait(300);
  if (settings.apiMode === 'mock') {
    return { ok: true, message: 'Servis yok, mock sistem kullanilacak', url: settings.apiBaseUrl };
  }

  if (!settings.terminalId.trim()) {
    return {
      ok: false,
      message: 'Baglanti bekliyor',
      url: settings.apiBaseUrl,
      reason: 'Terminal ID eksik',
    };
  }

  const result = await checkLocalPriceService(settings);
  if (result.ok || settings.apiMode === 'real') return result;

  return {
    ...result,
    ok: true,
    message: `Servis yok, mock sistem kullanilacak. Adres: ${result.url}. Neden: ${result.reason || 'Baglanti yok'}`,
  };
}
