import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersonnelUser } from '../types';

export type PilotFeedbackCategory =
  | 'Satış'
  | 'Barkod'
  | 'Yazdırma'
  | 'Performans'
  | 'Kullanım Kolaylığı'
  | 'Diğer';

export type PilotFeedbackEntry = {
  id: string;
  category: PilotFeedbackCategory;
  description: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
  createdByCode?: string;
  createdByName?: string;
  createdByRole?: string;
};

const PILOT_FEEDBACK_KEY = 'melisa-terminal:pilot-feedback';
const MAX_FEEDBACK = 300;

function normalizeFeedback(entries: PilotFeedbackEntry[]): PilotFeedbackEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && entry.id && entry.category && entry.description)
    .map((entry) => ({
      ...entry,
      description: String(entry.description || '').trim(),
      note: entry.note ? String(entry.note).trim() : undefined,
      createdAt: entry.createdAt || new Date().toISOString(),
    }))
    .slice(0, MAX_FEEDBACK);
}

async function readFeedback(): Promise<PilotFeedbackEntry[]> {
  try {
    const value = await AsyncStorage.getItem(PILOT_FEEDBACK_KEY);
    if (!value) return [];
    return normalizeFeedback(JSON.parse(value) as PilotFeedbackEntry[]);
  } catch {
    await AsyncStorage.removeItem(PILOT_FEEDBACK_KEY);
    return [];
  }
}

async function writeFeedback(entries: PilotFeedbackEntry[]): Promise<void> {
  await AsyncStorage.setItem(PILOT_FEEDBACK_KEY, JSON.stringify(normalizeFeedback(entries)));
}

export async function loadPilotFeedback(): Promise<PilotFeedbackEntry[]> {
  return readFeedback();
}

export async function addPilotFeedback(input: {
  category: PilotFeedbackCategory;
  description: string;
  note?: string;
  user?: PersonnelUser | null;
}): Promise<PilotFeedbackEntry> {
  const now = new Date().toISOString();
  const entry: PilotFeedbackEntry = {
    id: `pilot-feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: input.category,
    description: input.description.trim(),
    note: input.note?.trim() || undefined,
    createdAt: now,
    createdBy: input.user?.id,
    createdByCode: input.user?.code,
    createdByName: input.user?.name,
    createdByRole: input.user?.role,
  };
  const entries = await readFeedback();
  await writeFeedback([entry, ...entries]);
  return entry;
}

export { PILOT_FEEDBACK_KEY };
