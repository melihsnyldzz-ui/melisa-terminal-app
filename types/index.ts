export type AppScreen =
  | 'login'
  | 'dashboard'
  | 'newSale'
  | 'openDocuments'
  | 'qrAlbum'
  | 'messages'
  | 'failedQueue'
  | 'dataUpdate'
  | 'settings';

export type UserSession = {
  username: string;
  branch: string;
  terminalId: string;
  offlineMode: boolean;
};

export type MessageType = 'Acil' | 'Merkez' | 'Muhasebe' | 'Depo' | 'Fiş Notu';

export type Message = {
  id: string;
  type: MessageType;
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

export type QRAlbumItem = {
  id: string;
  name: string;
  color: string;
  size: string;
};

export type QRAlbum = {
  documentNo: string;
  customerLabel: string;
  items: QRAlbumItem[];
};

export type TerminalSettings = {
  terminalId: string;
  branch: string;
  apiBaseUrl: string;
};

export type FailedOperation = {
  id: string;
  title: string;
  reason: string;
  createdAt: string;
};
