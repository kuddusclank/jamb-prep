"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/lib/offline/network-state";
import { WifiOff, CheckCircle2, X } from "lucide-react";

export function NetworkStatusToast() {
  const { isOffline, isOnline } = useNetworkStatus();
  const [toastState, setToastState] = useState<"idle" | "unstable" | "restored">("idle");
  const [hasShownUnstableToast, setHasShownUnstableToast] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOffline) {
      // Debounce entering "unstable" state by 1.5s to absorb micro-stalls
      debounceTimer = setTimeout(() => {
        setHasShownUnstableToast(true);
        setIsDismissed(false);
        setToastState("unstable");
      }, 1500);
    } else if (isOnline) {
      if (hasShownUnstableToast) {
        setIsDismissed(false);
        setToastState("restored");
        dismissTimer = setTimeout(() => {
          setToastState("idle");
          setHasShownUnstableToast(false);
        }, 3000);
      } else {
        // Micro-drop resolved before toast was shown; stay idle
        setToastState("idle");
      }
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [isOffline, isOnline, hasShownUnstableToast]);

  if (toastState === "idle" || isDismissed) {
    return null;
  }

  const isUnstable = toastState === "unstable";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-sm sm:max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium transition-all ${
          isUnstable
            ? "bg-[#092E28] text-white border-emerald-800/60 shadow-emerald-950/20"
            : "bg-emerald-900 text-white border-emerald-600 shadow-emerald-950/20"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
              isUnstable ? "bg-amber-400 text-amber-950" : "bg-emerald-400 text-emerald-950"
            }`}
          >
            {isUnstable ? <WifiOff size={13} /> : <CheckCircle2 size={13} />}
          </div>
          <p className="leading-snug text-left">
            {isUnstable ? (
              <span>
                <strong className="font-semibold text-amber-300">Unstable network</strong> — studying in offline mode. Progress is saved.
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-emerald-300">Back online</strong> — all your offline progress is synced.
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss network banner"
          className="shrink-0 p-1 rounded-full text-emerald-300/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
