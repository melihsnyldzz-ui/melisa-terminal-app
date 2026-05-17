import type { OfflineQueueAction, OfflineQueueRetryState } from './offlineQueueTypes';

export const RETRY_POLICY = {
  maxRetry: 3,
  delaysMs: [30 * 1000, 2 * 60 * 1000, 5 * 60 * 1000],
};

export type RetryPlan = {
  retryState: OfflineQueueRetryState;
  retryEligible: boolean;
  retryDue: boolean;
  retryBlocked: boolean;
  maxRetryExceeded: boolean;
  nextRetryAt?: string;
  delayMs?: number;
};

export function hasExceededMaxRetry(action: Pick<OfflineQueueAction, 'retryCount'>): boolean {
  return action.retryCount >= RETRY_POLICY.maxRetry;
}

export function getRetryDelayMs(retryCount: number): number | undefined {
  if (retryCount >= RETRY_POLICY.maxRetry) return undefined;
  return RETRY_POLICY.delaysMs[Math.min(retryCount, RETRY_POLICY.delaysMs.length - 1)];
}

export function getNextRetryAt(action: Pick<OfflineQueueAction, 'createdAt' | 'retryCount' | 'retry'>): string | undefined {
  const delayMs = getRetryDelayMs(action.retryCount);
  if (delayMs === undefined) return undefined;
  const baseValue = action.retry.lastTriedAt || action.createdAt;
  const baseDate = new Date(baseValue);
  if (Number.isNaN(baseDate.getTime())) return undefined;
  return new Date(baseDate.getTime() + delayMs).toISOString();
}

export function isRetryDue(action: Pick<OfflineQueueAction, 'createdAt' | 'retryCount' | 'retry'>, now: Date = new Date()): boolean {
  const nextRetryAt = getNextRetryAt(action);
  if (!nextRetryAt) return false;
  return new Date(nextRetryAt).getTime() <= now.getTime();
}

export function isRetryEligible(action: Pick<OfflineQueueAction, 'status' | 'createdAt' | 'retryCount' | 'retry'>, now: Date = new Date()): boolean {
  return action.status === 'error' && !hasExceededMaxRetry(action) && isRetryDue(action, now);
}

export function getRetryPlan(action: Pick<OfflineQueueAction, 'status' | 'createdAt' | 'retryCount' | 'retry'>, now: Date = new Date()): RetryPlan {
  const maxRetryExceeded = hasExceededMaxRetry(action);
  const nextRetryAt = getNextRetryAt(action);
  const retryDue = Boolean(nextRetryAt && new Date(nextRetryAt).getTime() <= now.getTime());
  const retryBlocked = action.status !== 'error' || maxRetryExceeded || !nextRetryAt;
  const retryEligible = action.status === 'error' && !retryBlocked && retryDue;
  const retryState: OfflineQueueRetryState = retryBlocked ? 'blocked' : retryEligible ? 'eligible' : 'waiting';

  return {
    retryState,
    retryEligible,
    retryDue,
    retryBlocked,
    maxRetryExceeded,
    nextRetryAt,
    delayMs: getRetryDelayMs(action.retryCount),
  };
}
