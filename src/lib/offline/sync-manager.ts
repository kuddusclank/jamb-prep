"use client";

import {
  getOutboxItems,
  getOutboxCount,
  clearSyncedOutboxItems,
  updateOutboxItemRetry,
  type OutboxItem,
} from './idb-storage';
import { syncWeeklyPackToServer } from '@/lib/client-actions';
import { getDefaultBrowserSessionManager } from '@/lib/auth/session-manager';

export interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export type SyncStateListener = (state: SyncState) => void;

class SyncManager {
  private state: SyncState = {
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  private listeners = new Set<SyncStateListener>();
  private initialized = false;
  private syncThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSyncAttemptTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Network recovery listener
    window.addEventListener('online', () => {
      this.triggerSync('online_event');
    });

    // 2. Tab focus / resume listener
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.triggerSync('visibility_change');
      }
    });

    // 3. Initial check of pending outbox count
    this.refreshPendingCount();
  }

  /**
   * Subscribe to sync state changes.
   */
  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns a snapshot of current sync state.
   */
  public getState(): SyncState {
    return { ...this.state };
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[SyncManager] Listener error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('study-sync-state-changed', { detail: this.state })
      );
    }
  }

  /**
   * Refreshes the pending outbox count from IndexedDB.
   */
  public async refreshPendingCount(): Promise<number> {
    const userId = getDefaultBrowserSessionManager().getState().user?.id;
    if (!userId) {
      this.updateState({ pendingCount: 0 });
      return 0;
    }

    try {
      const count = await getOutboxCount(userId);
      this.updateState({ pendingCount: count });
      return count;
    } catch {
      return this.state.pendingCount;
    }
  }

  /**
   * Triggers a background sync with throttling and Web Lock concurrency protection.
   */
  public async triggerSync(triggerReason = 'manual'): Promise<number> {
    if (typeof window === 'undefined') return 0;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 0;
    }

    const userId = getDefaultBrowserSessionManager().getState().user?.id;
    if (!userId) {
      return 0;
    }

    // Throttle automatic triggers to at most once per 3 seconds
    const now = Date.now();
    if (triggerReason !== 'manual' && now - this.lastSyncAttemptTime < 3000) {
      if (!this.syncThrottleTimer) {
        this.syncThrottleTimer = setTimeout(() => {
          this.syncThrottleTimer = null;
          void this.triggerSync('throttled_retry');
        }, 3000);
      }
      return 0;
    }
    this.lastSyncAttemptTime = now;

    // Use Web Lock if supported to prevent multi-tab sync races
    if (typeof navigator !== 'undefined' && navigator.locks) {
      try {
        return await navigator.locks.request(
          `jambprep_sync_${userId}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              // Another tab is actively flushing the outbox
              return 0;
            }
            return await this.performOutboxDrain(userId);
          }
        );
      } catch {
        return await this.performOutboxDrain(userId);
      }
    } else {
      return await this.performOutboxDrain(userId);
    }
  }

  private async performOutboxDrain(userId: string): Promise<number> {
    if (this.state.isSyncing) return 0;

    let items: OutboxItem[] = [];
    try {
      items = await getOutboxItems(userId);
    } catch (err) {
      console.warn('[SyncManager] Failed to read outbox:', err);
      return 0;
    }

    if (!items.length) {
      this.updateState({ pendingCount: 0, isSyncing: false });
      return 0;
    }

    this.updateState({ isSyncing: true, pendingCount: items.length, lastError: null });

    // Group items by packId
    const byPack: Record<string, OutboxItem[]> = {};
    for (const item of items) {
      if (!byPack[item.packId]) byPack[item.packId] = [];
      byPack[item.packId].push(item);
    }

    let totalSynced = 0;
    let lastError: string | null = null;

    for (const [packId, batch] of Object.entries(byPack)) {
      try {
        const payload = batch.map((b) => ({
          questionId: b.questionId,
          selectedOption: b.selectedOption,
          answeredAt: b.answeredAt,
          revision: b.revision,
          idempotencyKey: b.idempotencyKey,
        }));

        const res = await syncWeeklyPackToServer(packId, payload);
        if (res.success) {
          // Identify successfully acknowledged items
          const ackedQuestionIds = new Set(
            res.itemAcks
              ? res.itemAcks
                  .filter((a) => a.status === 'accepted' || a.status === 'already_recorded')
                  .map((a) => a.questionId)
              : batch.map((b) => b.questionId)
          );

          const idsToClear = batch
            .filter((b) => b.id !== undefined && ackedQuestionIds.has(b.questionId))
            .map((b) => b.id!);

          await clearSyncedOutboxItems(idsToClear);
          totalSynced += res.syncedCount;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Sync request failed';
        console.warn(`[SyncManager] Batch sync error for pack ${packId}:`, err);

        // Update retry counts on failed batch items
        for (const item of batch) {
          if (item.id !== undefined) {
            void updateOutboxItemRetry(item.id, lastError);
          }
        }
      }
    }

    // Refresh final outbox count
    const remainingCount = await this.refreshPendingCount();

    this.updateState({
      isSyncing: false,
      pendingCount: remainingCount,
      lastSyncedAt: totalSynced > 0 ? new Date().toISOString() : this.state.lastSyncedAt,
      lastError,
    });

    return totalSynced;
  }
}

export const syncManager = new SyncManager();
