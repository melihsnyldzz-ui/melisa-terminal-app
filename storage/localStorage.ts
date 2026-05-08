import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSaleDraft, FailedOperation, OpenDocument, TerminalSettings, UserSession } from '../types';

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
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<TerminalSettings> {
  const settings = await readJson(KEYS.settings, defaultSettings);
  return settings.apiBaseUrl.toLowerCase().includes('mock') ? { ...settings, apiBaseUrl: defaultSettings.apiBaseUrl } : settings;
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
  return readJson<ActiveSaleDraft | null>(KEYS.activeSaleDraft, null);
}

export async function saveActiveSaleDraft(draft: ActiveSaleDraft): Promise<void> {
  await writeJson(KEYS.activeSaleDraft, draft);
}

export async function clearActiveSaleDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.activeSaleDraft);
}
