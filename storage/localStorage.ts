import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FailedOperation, OpenDocument, TerminalSettings, UserSession } from '../types';

const KEYS = {
  settings: 'melisa-terminal:settings',
  session: 'melisa-terminal:session',
  failedOperations: 'melisa-terminal:failed-operations',
  draftDocuments: 'melisa-terminal:draft-documents',
};

const defaultSettings: TerminalSettings = {
  terminalId: 'MB-TERM-001',
  branch: 'Merkez Depo',
  apiBaseUrl: 'Mock API',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<TerminalSettings> {
  return readJson(KEYS.settings, defaultSettings);
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
