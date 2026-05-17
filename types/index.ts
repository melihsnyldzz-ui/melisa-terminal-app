export type AppScreen =
  | 'login'
  | 'dashboard'
  | 'salesCustomer'
  | 'newSale'
  | 'saleReview'
  | 'picking'
  | 'openDocuments'
  | 'qrAlbum'
  | 'messages'
  | 'failedQueue'
  | 'dataUpdate'
  | 'auditLog'
  | 'currencySettings'
  | 'settings';

export type UserSession = {
  username: string;
  branch: string;
  terminalId: string;
  offlineMode: boolean;
};

export type SalesCustomer = {
  id: string;
  name: string;
  code: string;
  city: string;
  currency?: CurrencyCode;
  balanceLabel?: string;
  lastOperationLabel?: string;
};

export type MessageType = 'Acil' | 'Merkez' | 'Muhasebe' | 'Depo' | 'Fiş Notu';

export type Message = {
  id: string;
  type: MessageType;
  sender: string;
  title: string;
  body: string;
  read: boolean;
  relatedDocument?: string;
  timeLabel: string;
};

export type OpenDocumentStatus = 'Açık' | 'Beklemede' | 'Gönderilemedi';

export type OpenDocument = {
  id: string;
  customerName: string;
  itemCount: number;
  status: OpenDocumentStatus;
  updatedAt: string;
};

export type Product = {
  code: string;
  name: string;
  price: number;
  currency?: string;
  sourceCurrency?: CurrencyCode;
  color?: string;
  size?: string;
};

export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

export type SaleLine = Product & {
  lineId: string;
  quantity: number;
  sourceCurrency?: CurrencyCode;
  saleCurrency?: CurrencyCode;
  exchangeRate?: number;
  originalUnitPrice?: number;
  convertedUnitPrice?: number;
  originalLineTotal?: number;
  convertedLineTotal?: number;
};

export type SaleStatus = 'Taslak' | 'Hazır';

export type ActiveSaleDraft = {
  documentNo: string;
  customerName: string;
  saleCurrency?: CurrencyCode;
  exchangeRateSnapshot?: ExchangeRateSnapshot;
  status: SaleStatus;
  lines: SaleLine[];
  updatedAt: string;
};

export type ExchangeRateSnapshot = {
  USD_TO_TRY: number;
  EUR_TO_TRY: number;
  EUR_TO_USD: number;
  USD_TO_EUR: number;
};

export type CurrencySettings = ExchangeRateSnapshot & {
  updatedAt?: string;
  updatedBy?: string;
};

export type SalePrintJobLine = {
  lineId: string;
  code: string;
  name: string;
  quantity: number;
  sourceCurrency: CurrencyCode;
  saleCurrency: CurrencyCode;
  exchangeRate: number;
  originalUnitPrice: number;
  convertedUnitPrice: number;
  originalLineTotal: number;
  convertedLineTotal: number;
};

export type SalePrintJob = {
  id: string;
  documentNo: string;
  customerName: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  currency: string;
  saleCurrency?: CurrencyCode;
  exchangeRateSnapshot?: ExchangeRateSnapshot;
  lines?: SalePrintJobLine[];
  receiptText?: string;
  status: 'Yazdırma bekliyor' | 'Yazdırıldı' | 'Yazdırma hatası';
  createdAt: string;
};

export type AuditLogStatus = 'success' | 'warning' | 'error';

export type AuditLogOperationType =
  | 'Müşteri seçildi'
  | 'Yeni fiş oluşturuldu'
  | 'Ürün okutuldu'
  | 'Ürün fişe eklendi'
  | 'Ürün silindi'
  | 'Fiş tamamlandı'
  | 'Yazdırma kuyruğuna gönderildi'
  | 'Mock yazdırıldı'
  | 'PC bridge’e gönderildi'
  | 'saleCurrency seçildi'
  | 'saleCurrency değişti'
  | 'Kur ayarı değişti'
  | 'Fiş review açıldı'
  | 'Fiş onaylandı'
  | 'Fiş review uyarısı oluştu'
  | 'Hata oluştu';

export type AuditLogEntry = {
  id: string;
  operationType: AuditLogOperationType;
  createdAt: string;
  deviceName: string;
  personnelName: string;
  customerName?: string;
  documentNo?: string;
  description: string;
  status: AuditLogStatus;
};

export type PickingLine = {
  id: string;
  code: string;
  name: string;
  quantity: number;
  picked: number;
};

export type PackingBoxLine = {
  lineId: string;
  code: string;
  name: string;
  quantity: number;
};

export type PackingBox = {
  id: string;
  label: string;
  lines: PackingBoxLine[];
};

export type ActivePickingDraft = {
  documentNo: string;
  customerName: string;
  status: 'Toplanacak' | 'Toplanıyor' | 'Tamamlandı';
  lines: PickingLine[];
  boxes?: PackingBox[];
  activeBoxId?: string;
  packingStatus?: 'Kolilenmedi' | 'Kolileniyor' | 'Kolilendi';
  updatedAt: string;
};

export type QRAlbumItem = {
  id: string;
  code: string;
  name: string;
  color?: string;
  size?: string;
};

export type QRAlbum = {
  documentNo: string;
  customerLabel: string;
  status: 'Hazır' | 'Taslak';
  items: QRAlbumItem[];
};

export type TerminalSettings = {
  terminalId: string;
  branch: string;
  apiBaseUrl: string;
  apiMode: 'mock' | 'real' | 'fallback';
  vibrationEnabled: boolean;
  urgentVibrationEnabled: boolean;
};

export type FailedOperation = {
  id: string;
  documentNo: string;
  operationType: string;
  title: string;
  reason: string;
  createdAt: string;
  status: 'Bekliyor' | 'Gönderilemedi' | 'Tekrar denenecek';
};
