"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { syncManager, type SyncState } from "@/lib/offline/sync-manager";
import { useNetworkStatus } from "@/lib/offline/network-state";

interface SyncStatusIndicatorProps {
  className?: string;
  showWhenAllSynced?: boolean;
}

export function SyncStatusIndicator({
  className = "",
  showWhenAllSynced = false,
}: SyncStatusIndicatorProps) {
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    return syncManager.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  const handleManualSync = () => {
    if (isOnline && !syncState.isSyncing) {
      void syncManager.triggerSync("manual_tap");
    }
  };

  const { isSyncing, pendingCount, lastError } = syncState;

  // 1. Actively Syncing
  if (isSyncing) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 transition-all ${className}`}
        title={`Syncing ${pendingCount} offline answer${pendingCount === 1 ? '' : 's'} to server...`}
      >
        <RefreshCw size={12} className="animate-spin text-emerald-600 shrink-0" />
        <span className="tabular-nums">
          Syncing {pendingCount > 0 ? `${pendingCount}...` : '...'}
        </span>
      </div>
    );
  }

  // 2. Offline with Pending Answers
  if (!isOnline && pendingCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs ${className}`}
        title={`${pendingCount} answer${pendingCount === 1 ? '' : 's'} stored safely on this device. Will sync automatically when connection returns.`}
      >
        <CloudOff size={12} className="text-amber-700 shrink-0" />
        <span className="tabular-nums">
          {pendingCount} saved offline
        </span>
      </div>
    );
  }

  // 3. Online but Sync Failed / Needs Retry
  if (isOnline && (lastError || pendingCount > 0)) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition cursor-pointer active:scale-95 shadow-2xs ${className}`}
        title={lastError ? `Sync paused: ${lastError}. Tap to retry.` : `${pendingCount} answers pending sync. Tap to sync.`}
      >
        <AlertCircle size={12} className="text-amber-800 shrink-0" />
        <span className="tabular-nums">
          {pendingCount} pending · <span className="underline">Sync</span>
        </span>
      </button>
    );
  }

  // 4. All Synced (Optional Display or in Weekly Practice Header)
  if (showWhenAllSynced) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 ${className}`}
        title="All practice answers are safely synchronized with the server."
      >
        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        <span>All synced</span>
      </div>
    );
  }

  return null;
}
