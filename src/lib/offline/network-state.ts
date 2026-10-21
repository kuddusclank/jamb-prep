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
   * Immediately switches app to offline state when any fetch fails with a network, DNS, or timeout error.
   */
  public markOffline(reason?: string): void {
    if (!this.isOnlineState) return;
    this.isOnlineState = false;
    this.notifyListeners();
    this.startRecoveryPolling();
  }

  /**
   * Switches app back to online state when verified.
   */
  public markOnline(): void {
    if (this.isOnlineState) return;
    this.isOnlineState = true;
    this.stopRecoveryPolling();
    this.notifyListeners();
  }

  /**
   * Actively tests if the device has real internet access by probing the local public origin.
   */
  public async probeConnection(): Promise<boolean> {
    if (typeof window === "undefined") return true;
    if (this.pingInFlight) return this.isOnlineState;

    this.pingInFlight = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

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
        this.markOffline("probe_bad_status");
        return false;
      }
    } catch {
      this.markOffline("probe_network_failure");
      return false;
    } finally {
      this.pingInFlight = false;
    }
  }

  private handleWindowOnline(): void {
    // When window fires 'online', verify with actual probe before declaring online
    void this.probeConnection();
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
    // Probe every 8 seconds to automatically recover the moment connection returns
    this.pingIntervalId = setInterval(() => {
      if (!this.isOnlineState) {
        void this.probeConnection();
      } else {
        this.stopRecoveryPolling();
      }
    }, 8000);
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
