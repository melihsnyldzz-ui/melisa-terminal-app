import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSaleDraft, SalePrintJob } from '../types';
import type { OfflineQueueAction, OfflineQueueActionPayload } from '../app/offline/offlineQueueTypes';

const OFFLINE_QUEUE_KEY = 'melisa-terminal:offline-queue';
const MAX_OFFLINE_ACTIONS = 500;

async function readQueue(): Promise<OfflineQueueAction[]> {
  try {
    const value = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as OfflineQueueAction[];
    return normalizeOfflineActions(parsed);
  } catch {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return [];
  }
}

async function writeQueue(actions: OfflineQueueAction[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(normalizeOfflineActions(actions).slice(0, MAX_OFFLINE_ACTIONS)));
}

function normalizeOfflineActions(actions: OfflineQueueAction[]): OfflineQueueAction[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((action) => action && action.id && action.payload)
    .map((action) => {
      const retryCount = Number.isFinite(action.retryCount) && action.retryCount >= 0 ? action.retryCount : action.retry?.retryCount || 0;
      const updatedAt = action.updatedAt || action.createdAt || new Date().toISOString();
      return {
        ...action,
        status: action.status === 'error' ? 'error' : 'pending',
        createdAt: action.createdAt || updatedAt,
        updatedAt,
        retryCount,
        lastError: action.lastError || action.retry?.lastError,
        retry: {
          retryCount,
          lastTriedAt: action.retry?.lastTriedAt,
          nextRetryAfter: action.retry?.nextRetryAfter,
          lastError: action.lastError || action.retry?.lastError,
        },
      };
    });
}

function buildPrintRetryPayload(printJob: SalePrintJob): OfflineQueueActionPayload {
  return { type: 'printRetry', printJob };
}

function buildPendingSaleCompletionPayload(saleDraft: ActiveSaleDraft): OfflineQueueActionPayload {
  return { type: 'pendingSaleCompletion', saleDraft };
}

export function createPrintRetryOfflineAction(printJob: SalePrintJob, lastError?: string): Omit<OfflineQueueAction, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    actionType: 'printRetry',
    status: lastError ? 'error' : 'pending',
    documentNo: printJob.documentNo,
    customerName: printJob.customerName,
    retryCount: 0,
    lastError,
    retry: {
      retryCount: 0,
      lastError,
    },
    payload: buildPrintRetryPayload(printJob),
  };
}

export function createPendingSaleCompletionOfflineAction(saleDraft: ActiveSaleDraft, lastError?: string): Omit<OfflineQueueAction, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    actionType: 'pendingSaleCompletion',
    status: lastError ? 'error' : 'pending',
    documentNo: saleDraft.documentNo,
    customerName: saleDraft.customerName,
    retryCount: 0,
    lastError,
    retry: {
      retryCount: 0,
      lastError,
    },
    payload: buildPendingSaleCompletionPayload(saleDraft),
  };
}

export async function loadOfflineActions(): Promise<OfflineQueueAction[]> {
  return readQueue();
}

export async function addOfflineAction(action: Omit<OfflineQueueAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineQueueAction> {
  const now = new Date().toISOString();
  const nextAction: OfflineQueueAction = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    retryCount: action.retryCount || 0,
    retry: {
      ...action.retry,
      retryCount: action.retryCount || action.retry.retryCount || 0,
      lastError: action.lastError || action.retry.lastError,
    },
  };
  const actions = await readQueue();
  await writeQueue([nextAction, ...actions]);
  return nextAction;
}

export async function removeOfflineAction(actionId: string): Promise<void> {
  const actions = await readQueue();
  await writeQueue(actions.filter((action) => action.id !== actionId));
}

export async function removeOfflineActionsByStatus(status: OfflineQueueAction['status']): Promise<void> {
  const actions = await readQueue();
  await writeQueue(actions.filter((action) => action.status !== status));
}

export async function clearOfflineActions(): Promise<void> {
  await writeQueue([]);
}

export async function updateOfflineAction(actionId: string, patch: Partial<OfflineQueueAction>): Promise<OfflineQueueAction | null> {
  const actions = await readQueue();
  let updatedAction: OfflineQueueAction | null = null;
  const nextActions = actions.map((action) => {
    if (action.id !== actionId) return action;
    const retryCount = patch.retryCount ?? patch.retry?.retryCount ?? action.retryCount;
    updatedAction = {
      ...action,
      ...patch,
      updatedAt: new Date().toISOString(),
      retryCount,
      lastError: patch.lastError ?? patch.retry?.lastError ?? action.lastError,
      retry: {
        ...action.retry,
        ...patch.retry,
        retryCount,
        lastError: patch.lastError ?? patch.retry?.lastError ?? action.lastError,
      },
    };
    return updatedAction;
  });
  await writeQueue(nextActions);
  return updatedAction;
}

export { OFFLINE_QUEUE_KEY };
