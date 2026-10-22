/**
 * Reactive Real-Time Network State & Auto-Switch Coordinator
 *
 * Browsers' `navigator.onLine` is notoriously unreliable (it returns `true` even
 * when Wi-Fi is connected to a dead router or DNS cannot resolve hosts).
 *
 * This coordinator provides:
 * 1. Immediate listener to window 'online' / 'offline' events.
 * 2. Instant offline switching whenever any fetch fails with a network/DNS/timeout error.
 * 3. Proactive heartbeat ping with fast timeout to detect genuine re-connectivity.
 * 4. Reactive React hook `useNetworkStatus()` that triggers automatic re-renders the moment
 *    the app loses or regains internet.
 */

import { useState, useEffect } from "react";

type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkStateManager {
  private isOnlineState: boolean = true;
  private listeners = new Set<NetworkStatusListener>();
  private pingInFlight: boolean = false;
  private pingIntervalId?: ReturnType<typeof setInterval>;
  private consecutiveFailures: number = 0;
  private lastFailureTimestamp: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnlineState = typeof navigator !== "undefined" ? navigator.onLine : true;

      window.addEventListener("online", () => this.handleWindowOnline());
      window.addEventListener("offline", () => this.markOffline("browser_offline_event"));

      // Check connectivity when switching back to tab
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void this.probeConnection();
        }
      });

      window.addEventListener("focus", () => {
        void this.probeConnection();
      });
    }
  }

  public get isOnline(): boolean {
    return this.isOnlineState;
  }

  public get isOffline(): boolean {
    return !this.isOnlineState;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnlineState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Switches app to offline state.
   *
   * To prevent rapid flapping / oscillation on mobile network jitter:
   * 1. Browser OS offline events or navigator.onLine === false switch offline immediately.
   * 2. Transient fetch/network errors require consecutive failures within a 15s window,
   *    or are verified via a lightweight probe before flipping the global offline state.
   */
  public markOffline(reason?: string): void {
    const isOsOffline =
      reason === "browser_offline_event" ||
      (typeof navigator !== "undefined" && !navigator.onLine);

    const now = Date.now();
    if (now - this.lastFailureTimestamp > 15000) {
      this.consecutiveFailures = 0;
    }
    this.lastFailureTimestamp = now;
    this.consecutiveFailures++;

    if (isOsOffline || this.consecutiveFailures >= 2) {
      if (!this.isOnlineState) return;
      this.isOnlineState = false;
      this.notifyListeners();
      this.startRecoveryPolling();
      return;
    }

    // First isolated fetch failure while OS claims online:
    // Verify via probe asynchronously before tearing down the user's online session
    if (this.isOnlineState && !this.pingInFlight) {
      void this.probeConnection();
    }
  }

  /**
   * Switches app back to online state when verified.
   */
  public markOnline(): void {
    this.consecutiveFailures = 0;
    if (this.isOnlineState) return;
    this.isOnlineState = true;
    this.stopRecoveryPolling();
    this.notifyListeners();
  }

  /**
   * Actively tests if the device has real internet access by probing the local public origin.
   * Uses a 5000ms timeout to avoid false negatives on high-latency mobile networks.
   */
  public async probeConnection(): Promise<boolean> {
    if (typeof window === "undefined") return true;
    if (this.pingInFlight) return this.isOnlineState;

    this.pingInFlight = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      // Probe public asset on the current origin with cache-busting
      const res = await fetch(`/lecterniq-mark.svg?_hb=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok || res.status < 500) {
        this.markOnline();
        return true;
      } else {
        this.consecutiveFailures = Math.max(this.consecutiveFailures, 2);
        if (this.isOnlineState) {
          this.isOnlineState = false;
          this.notifyListeners();
          this.startRecoveryPolling();
        }
        return false;
      }
    } catch {
      this.consecutiveFailures = Math.max(this.consecutiveFailures, 2);
      if (this.isOnlineState) {
        this.isOnlineState = false;
        this.notifyListeners();
        this.startRecoveryPolling();
      }
      return false;
    } finally {
      this.pingInFlight = false;
    }
  }

  private handleWindowOnline(): void {
    // When window fires 'online', verify with staggered probes
    void this.probeConnection();
    setTimeout(() => {
      if (!this.isOnlineState) void this.probeConnection();
    }, 1500);
    setTimeout(() => {
      if (!this.isOnlineState) void this.probeConnection();
    }, 4000);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isOnlineState);
      } catch (err) {
        console.error("[NetworkStateManager] Error notifying listener", err);
      }
    }
  }

  private startRecoveryPolling(): void {
    if (this.pingIntervalId) return;
    // Probe every 5 seconds to automatically recover without hammering jittery connections
    this.pingIntervalId = setInterval(() => {
      if (!this.isOnlineState) {
        void this.probeConnection();
      } else {
        this.stopRecoveryPolling();
      }
    }, 5000);
  }

  private stopRecoveryPolling(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = undefined;
    }
  }
}

// Singleton instance
let networkStateManagerInstance: NetworkStateManager | null = null;

export function getNetworkStateManager(): NetworkStateManager {
  if (!networkStateManagerInstance) {
    networkStateManagerInstance = new NetworkStateManager();
  }
  return networkStateManagerInstance;
}

/**
 * Checks if an error message or error object indicates a network, DNS, or timeout failure.
 */
export function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!error) return false;

  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

  return (
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("hostname could not be found") ||
    msg.includes("server with the specified hostname") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("request timed out") ||
    msg.includes("timeout") ||
    msg.includes("internet connection appears to be offline") ||
    msg.includes("err_name_not_resolved") ||
    msg.includes("err_internet_disconnected") ||
    msg.includes("err_connection_refused") ||
    msg.includes("request_timeout")
  );
}

/**
 * React hook that returns current network status and updates automatically
 * the moment connectivity drops or restores.
 */
export function useNetworkStatus(): { isOnline: boolean; isOffline: boolean; checkConnection: () => Promise<boolean> } {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return getNetworkStateManager().isOnline;
  });

  useEffect(() => {
    const manager = getNetworkStateManager();
    const unsubscribe = manager.subscribe((online) => {
      setIsOnline(online);
    });
    return unsubscribe;
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    checkConnection: () => getNetworkStateManager().probeConnection(),
  };
}
