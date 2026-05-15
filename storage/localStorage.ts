import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSaleDraft, FailedOperation, OpenDocument, SaleLine, TerminalSettings, UserSession } from '../types';

const KEYS = {
  settings: 'melisa-terminal:settings',
  session: 'melisa-terminal:session',
  failedOperations: 'melisa-terminal:failed-operations',
  draftDocuments: 'melisa-terminal:draft-documents',
  activeSaleDraft: 'melisa-terminal:active-sale-draft',
};

const defaultSettings: TerminalSettings = {
  terminalId: 'MB-TERM-001',
  branch: 'Merkez Depo',
  apiBaseUrl: 'Hazırlık Bağlantısı',
  apiMode: 'fallback',
  vibrationEnabled: true,
  urgentVibrationEnabled: true,
};

const normalizeSaleLine = (line: SaleLine): SaleLine => {
  const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  const price = Number.isFinite(line.price) && line.price >= 0 ? line.price : 0;
  return {
    ...line,
    quantity,
    price,
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
  return safeSettings.apiBaseUrl.toLowerCase().includes('mock') ? { ...safeSettings, apiBaseUrl: defaultSettings.apiBaseUrl } : safeSettings;
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
