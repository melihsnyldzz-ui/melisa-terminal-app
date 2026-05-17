import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_EXCHANGE_RATES, normalizeCurrencyCode, normalizeSaleLineCurrency } from '../app/utils/currencyUtils';
import type { ActivePickingDraft, ActiveSaleDraft, AuditLogEntry, FailedOperation, OpenDocument, PickingLine, SaleLine, SalePrintJob, SalesCustomer, TerminalSettings, UserSession } from '../types';

const KEYS = {
  settings: 'melisa-terminal:settings',
  session: 'melisa-terminal:session',
  failedOperations: 'melisa-terminal:failed-operations',
  draftDocuments: 'melisa-terminal:draft-documents',
  selectedSalesCustomer: 'melisa-terminal:selected-sales-customer',
  activeSaleDraft: 'melisa-terminal:active-sale-draft',
  activePickingDraft: 'melisa-terminal:active-picking-draft',
  salePrintJobs: 'melisa-terminal:sale-print-jobs',
  auditLogs: 'melisa-terminal:audit-logs',
};

const MAX_AUDIT_LOGS = 500;

const defaultSettings: TerminalSettings = {
  terminalId: 'MB-TERM-001',
  branch: 'Merkez Depo',
  apiBaseUrl: 'http://192.168.1.45:8787',
  apiMode: 'fallback',
  vibrationEnabled: true,
  urgentVibrationEnabled: true,
};

const normalizeSaleLine = (line: SaleLine): SaleLine => {
  const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  const price = Number.isFinite(line.price) && line.price >= 0 ? line.price : 0;
  return normalizeSaleLineCurrency({ ...line, quantity, price }, normalizeCurrencyCode(line.saleCurrency || line.currency));
};

const normalizePickingLine = (line: PickingLine): PickingLine => {
  const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  const picked = Number.isFinite(line.picked) && line.picked >= 0 ? Math.min(line.picked, quantity) : 0;
  return {
    ...line,
    code: String(line.code || '').trim().toUpperCase(),
    name: line.name || 'Ürün adı yok',
    quantity,
    picked,
  };
};

const normalizeActiveSaleDraft = (draft: ActiveSaleDraft | null): ActiveSaleDraft | null => {
  if (!draft) return null;
  const saleCurrency = normalizeCurrencyCode(draft.saleCurrency);
  return {
    ...draft,
    customerName: draft.customerName || 'Seçili müşteri yok',
    saleCurrency,
    exchangeRateSnapshot: draft.exchangeRateSnapshot || DEFAULT_EXCHANGE_RATES,
    status: draft.lines?.length ? 'Hazır' : 'Taslak',
    lines: Array.isArray(draft.lines) ? draft.lines.map((line) => normalizeSaleLineCurrency(normalizeSaleLine(line), saleCurrency, draft.exchangeRateSnapshot || DEFAULT_EXCHANGE_RATES)) : [],
  };
};

const normalizeActivePickingDraft = (draft: ActivePickingDraft | null): ActivePickingDraft | null => {
  if (!draft) return null;
  const lines = Array.isArray(draft.lines) ? draft.lines.map(normalizePickingLine) : [];
  const totalRequired = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalPicked = lines.reduce((sum, line) => sum + Math.min(line.picked, line.quantity), 0);
  const status = totalRequired > 0 && totalPicked >= totalRequired ? 'Tamamlandı' : totalPicked > 0 ? 'Toplanıyor' : 'Toplanacak';
  return {
    ...draft,
    customerName: draft.customerName || 'Seçili müşteri yok',
    status,
    lines,
  };
};

const normalizeSalePrintJobs = (jobs: SalePrintJob[]): SalePrintJob[] => Array.isArray(jobs) ? jobs.map((job) => ({
  ...job,
  lineCount: Number.isFinite(job.lineCount) ? job.lineCount : 0,
  totalQuantity: Number.isFinite(job.totalQuantity) ? job.totalQuantity : 0,
  totalAmount: Number.isFinite(job.totalAmount) ? job.totalAmount : 0,
  currency: normalizeCurrencyCode(job.saleCurrency || job.currency),
  saleCurrency: normalizeCurrencyCode(job.saleCurrency || job.currency),
  exchangeRateSnapshot: job.exchangeRateSnapshot || DEFAULT_EXCHANGE_RATES,
  lines: Array.isArray(job.lines) ? job.lines : [],
  status: job.status || 'Yazdırma bekliyor',
})) : [];

const normalizeAuditLogs = (logs: AuditLogEntry[]): AuditLogEntry[] => Array.isArray(logs)
  ? logs
    .filter((log) => log && log.id && log.operationType && log.createdAt)
    .slice(0, MAX_AUDIT_LOGS)
  : [];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<TerminalSettings> {
  const settings = await readJson(KEYS.settings, defaultSettings);
  const normalizedSettings = { ...defaultSettings, ...settings };
  const safeApiMode = ['mock', 'real', 'fallback'].includes(normalizedSettings.apiMode) ? normalizedSettings.apiMode : defaultSettings.apiMode;
  const safeSettings = { ...normalizedSettings, apiMode: safeApiMode };
  const apiBaseUrl = String(safeSettings.apiBaseUrl || '').trim();
  if (!apiBaseUrl || apiBaseUrl.toLowerCase().includes('mock') || apiBaseUrl.toLowerCase().includes('haz')) {
    return { ...safeSettings, apiBaseUrl: defaultSettings.apiBaseUrl };
  }
  return { ...safeSettings, apiBaseUrl };
}

export async function saveSettings(settings: TerminalSettings): Promise<void> {
  await writeJson(KEYS.settings, settings);
}

export async function loadSession(): Promise<UserSession | null> {
  return readJson<UserSession | null>(KEYS.session, null);
}

export async function saveSession(session: UserSession): Promise<void> {
  await writeJson(KEYS.session, session);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
}

export async function loadFailedOperations(): Promise<FailedOperation[]> {
  return readJson(KEYS.failedOperations, []);
}

export async function loadFailedOperationsSnapshot(): Promise<FailedOperation[] | null> {
  return readJson<FailedOperation[] | null>(KEYS.failedOperations, null);
}

export async function saveFailedOperations(operations: FailedOperation[]): Promise<void> {
  await writeJson(KEYS.failedOperations, operations);
}

export async function loadDraftDocuments(): Promise<OpenDocument[]> {
  return readJson(KEYS.draftDocuments, []);
}

export async function saveDraftDocuments(documents: OpenDocument[]): Promise<void> {
  await writeJson(KEYS.draftDocuments, documents);
}

export async function loadSelectedSalesCustomer(): Promise<SalesCustomer | null> {
  return readJson<SalesCustomer | null>(KEYS.selectedSalesCustomer, null);
}

export async function saveSelectedSalesCustomer(customer: SalesCustomer): Promise<void> {
  await writeJson(KEYS.selectedSalesCustomer, customer);
}

export async function clearSelectedSalesCustomer(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.selectedSalesCustomer);
}

export async function loadActiveSaleDraft(): Promise<ActiveSaleDraft | null> {
  const draft = await readJson<ActiveSaleDraft | null>(KEYS.activeSaleDraft, null);
  return normalizeActiveSaleDraft(draft);
}

export async function saveActiveSaleDraft(draft: ActiveSaleDraft): Promise<void> {
  await writeJson(KEYS.activeSaleDraft, normalizeActiveSaleDraft(draft));
}

export async function clearActiveSaleDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.activeSaleDraft);
}

export async function loadSalePrintJobs(): Promise<SalePrintJob[]> {
  const jobs = await readJson<SalePrintJob[]>(KEYS.salePrintJobs, []);
  return normalizeSalePrintJobs(jobs);
}

export async function saveSalePrintJobs(jobs: SalePrintJob[]): Promise<void> {
  await writeJson(KEYS.salePrintJobs, normalizeSalePrintJobs(jobs));
}

export async function addSalePrintJob(job: SalePrintJob): Promise<void> {
  const jobs = await loadSalePrintJobs();
  await saveSalePrintJobs([job, ...jobs]);
}

export async function loadAuditLogs(): Promise<AuditLogEntry[]> {
  const logs = await readJson<AuditLogEntry[]>(KEYS.auditLogs, []);
  return normalizeAuditLogs(logs);
}

export async function saveAuditLogs(logs: AuditLogEntry[]): Promise<void> {
  await writeJson(KEYS.auditLogs, normalizeAuditLogs(logs));
}

export async function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt' | 'deviceName' | 'personnelName'> & Partial<Pick<AuditLogEntry, 'deviceName' | 'personnelName'>>): Promise<void> {
  const [logs, session, settings] = await Promise.all([loadAuditLogs(), loadSession(), loadSettings()]);
  const now = new Date().toISOString();
  const nextEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    deviceName: entry.deviceName || session?.terminalId || settings.terminalId || 'Bilinmeyen cihaz',
    personnelName: entry.personnelName || session?.username || 'Personel',
    operationType: entry.operationType,
    customerName: entry.customerName,
    documentNo: entry.documentNo,
    description: entry.description,
    status: entry.status,
  };
  await saveAuditLogs([nextEntry, ...logs].slice(0, MAX_AUDIT_LOGS));
}

export async function loadActivePickingDraft(): Promise<ActivePickingDraft | null> {
  const draft = await readJson<ActivePickingDraft | null>(KEYS.activePickingDraft, null);
  return normalizeActivePickingDraft(draft);
}

export async function saveActivePickingDraft(draft: ActivePickingDraft): Promise<void> {
  await writeJson(KEYS.activePickingDraft, normalizeActivePickingDraft(draft));
}

export async function clearActivePickingDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.activePickingDraft);
}
