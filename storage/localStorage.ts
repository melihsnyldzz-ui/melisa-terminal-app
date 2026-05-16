import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivePickingDraft, ActiveSaleDraft, FailedOperation, OpenDocument, PickingLine, SaleLine, SalePrintJob, SalesCustomer, TerminalSettings, UserSession } from '../types';

const KEYS = {
  settings: 'melisa-terminal:settings',
  session: 'melisa-terminal:session',
  failedOperations: 'melisa-terminal:failed-operations',
  draftDocuments: 'melisa-terminal:draft-documents',
  selectedSalesCustomer: 'melisa-terminal:selected-sales-customer',
  activeSaleDraft: 'melisa-terminal:active-sale-draft',
  activePickingDraft: 'melisa-terminal:active-picking-draft',
  salePrintJobs: 'melisa-terminal:sale-print-jobs',
};

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
  return { ...line, quantity, price };
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
  return {
    ...draft,
    customerName: draft.customerName || 'Seçili müşteri yok',
    status: draft.lines?.length ? 'Hazır' : 'Taslak',
    lines: Array.isArray(draft.lines) ? draft.lines.map(normalizeSaleLine) : [],
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
  currency: job.currency || 'TL',
  status: job.status || 'Yazdırma bekliyor',
})) : [];

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
