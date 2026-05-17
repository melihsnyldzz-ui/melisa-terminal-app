import type { ActiveSaleDraft, SalePrintJob } from '../../types';

export type OfflineQueueActionType = 'printRetry' | 'pendingSaleCompletion';

export type OfflineQueueStatus = 'pending' | 'error';

export type OfflineQueueRetryMetadata = {
  retryCount: number;
  lastTriedAt?: string;
  nextRetryAfter?: string;
  lastError?: string;
};

export type OfflineQueueActionPayload =
  | {
      type: 'printRetry';
      printJob: SalePrintJob;
    }
  | {
      type: 'pendingSaleCompletion';
      saleDraft: ActiveSaleDraft;
    };

export type OfflineQueueAction = {
  id: string;
  actionType: OfflineQueueActionType;
  status: OfflineQueueStatus;
  documentNo?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError?: string;
  retry: OfflineQueueRetryMetadata;
  payload: OfflineQueueActionPayload;
};
