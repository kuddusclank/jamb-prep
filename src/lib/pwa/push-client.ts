import { createNativeApiClient } from "@/lib/api/native-client";
import { registerPrivateCacheClearer } from "@/lib/auth/storage-cleanup";

export const LOCAL_PUSH_META_STORAGE_KEY = "jambprep_push_device_meta";

export type PushEnvironmentKind =
  | "browser"
  | "standalone_pwa"
  | "ios_home_screen_pwa"
  | "android_pwa";

export interface PushCapabilitySnapshot {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  requiresIosHomeScreenInstall: boolean;
  isStandalone: boolean;
  environment: PushEnvironmentKind;
  defaultDeviceLabel: string;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const trimmed = base64String.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (trimmed.length % 4)) % 4;
  const padded = trimmed + "=".repeat(padLength);
  const rawData = atob(padded);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256HexBrowser(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function detectPushCapability(): PushCapabilitySnapshot {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      requiresIosHomeScreenInstall: false,
      isStandalone: false,
      environment: "browser",
      defaultDeviceLabel: "Study device",
    };
  }

  const ua = navigator.userAgent || "";
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const hasSwAndPush =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const requiresIosHomeScreenInstall = isIos && !isStandalone;
  const supported = hasSwAndPush && !requiresIosHomeScreenInstall;
  const permission: NotificationPermission | "unsupported" =
    "Notification" in window ? Notification.permission : "unsupported";

  let environment: PushEnvironmentKind = "browser";
  if (isIos && isStandalone) {
    environment = "ios_home_screen_pwa";
  } else if (isAndroid && isStandalone) {
    environment = "android_pwa";
  } else if (isStandalone) {
    environment = "standalone_pwa";
  }

  let defaultDeviceLabel = "Web browser";
  if (isIos) {
    defaultDeviceLabel = isStandalone ? "iPhone / iPad Home Screen app" : "iPhone / iPad Safari";
  } else if (isAndroid) {
    defaultDeviceLabel = isStandalone ? "Android installed app" : "Android browser";
  } else if (/Mac/i.test(ua)) {
    defaultDeviceLabel = isStandalone ? "Mac installed app" : "Mac browser";
  } else if (/Win/i.test(ua)) {
    defaultDeviceLabel = isStandalone ? "Windows installed app" : "Windows browser";
  }

  return {
    supported,
    permission,
    requiresIosHomeScreenInstall,
    isStandalone,
    environment,
    defaultDeviceLabel,
  };
}

export async function getExistingRootServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active) return existing;
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration | null>((resolve) =>
        setTimeout(() => resolve(existing ?? null), 3500)
      ),
    ]);
  } catch {
    return null;
  }
}

export async function ensureActiveRootServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  let registration = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } else {
    void registration.update().catch(() => undefined);
  }

  // If already active (or active in another state like activating), ready to use pushManager
  if (registration.active) {
    return registration;
  }

  return await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      cleanup();
      if (registration?.active || registration?.waiting) {
        resolve(registration);
      } else {
        reject(
          new Error(
            "Service worker is still starting up. Please wait a moment and try enabling notifications again."
          )
        );
      }
    }, 8000);

    const listeners: Array<{ worker: ServiceWorker; fn: () => void }> = [];

    const cleanup = () => {
      clearTimeout(timeoutId);
      registration?.removeEventListener("updatefound", onUpdateFound);
      for (const { worker, fn } of listeners) {
        worker.removeEventListener("statechange", fn);
      }
      listeners.length = 0;
    };

    const checkState = () => {
      if (resolved) return true;
      if (registration?.active) {
        resolved = true;
        cleanup();
        resolve(registration);
        return true;
      }
      return false;
    };

    const watchWorker = (worker: ServiceWorker | null | undefined) => {
      if (!worker) return;
      const fn = () => {
        if (checkState()) return;
        if (
          worker.state === "redundant" &&
          !registration?.active &&
          !registration?.installing &&
          !registration?.waiting
        ) {
          cleanup();
          reject(
            new Error(
              "Service worker installation failed. Please refresh the page and try again."
            )
          );
        }
      };
      worker.addEventListener("statechange", fn);
      listeners.push({ worker, fn });
    };

    const onUpdateFound = () => {
      if (checkState()) return;
      watchWorker(registration?.installing);
    };

    if (checkState()) return;

    registration.addEventListener("updatefound", onUpdateFound);
    watchWorker(registration.installing);
    watchWorker(registration.waiting);
    watchWorker(registration.active);

    void navigator.serviceWorker.ready
      .then((readyReg) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(readyReg);
        }
      })
      .catch(() => undefined);
  });
}

export async function getExistingBrowserPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getExistingRootServiceWorkerRegistration();
  if (!registration || !registration.pushManager) {
    return null;
  }
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function getCurrentBrowserEndpointHash(): Promise<string | null> {
  try {
    const sub = await getExistingBrowserPushSubscription();
    if (sub?.endpoint) {
      return await sha256HexBrowser(new URL(sub.endpoint).toString());
    }
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LOCAL_PUSH_META_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { endpointHash?: string };
        if (parsed.endpointHash && /^[a-f0-9]{64}$/i.test(parsed.endpointHash)) {
          return parsed.endpointHash.toLowerCase();
        }
      }
    }
  } catch {
    // Ignore storage or PushManager access failures
  }
  return null;
}

export interface BrowserPushSubscribePayload {
  endpoint: string;
  endpointHash: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceLabel: string;
  environment: PushEnvironmentKind;
}

/**
 * Requests notification permission (must be triggered from an explicit user tap)
 * and subscribes the existing root service worker to Web Push using the public VAPID key.
 */
export async function subscribeBrowserToWebPush(
  vapidPublicKey: string,
  customDeviceLabel?: string
): Promise<BrowserPushSubscribePayload> {
  const capability = detectPushCapability();
  if (capability.requiresIosHomeScreenInstall) {
    throw new Error(
      "On iPhone and iPad, add JAMBPrep to your Home Screen first, then open it from your Home Screen to enable study reminders."
    );
  }
  if (!capability.supported) {
    throw new Error(
      "Push notifications are not supported in this browser environment. Your daily study goal and streak still work normally."
    );
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted. You can allow notifications in your browser settings whenever you are ready."
    );
  }

  const registration = await ensureActiveRootServiceWorkerRegistration();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
    // PushManager.subscribe accepts BufferSource (ArrayBufferView or ArrayBuffer).
    const subscribePromise = registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as unknown as BufferSource,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Device connection timed out while reaching Google Play Services / FCM. Please check your internet connection or Google Play Services and try again."
            )
          ),
        15000
      )
    );

    subscription = await Promise.race([subscribePromise, timeoutPromise]);
  }

  const p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"));
  const auth = arrayBufferToBase64Url(subscription.getKey("auth"));
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("Browser returned an incomplete Web Push subscription.");
  }

  const canonicalEndpoint = new URL(subscription.endpoint).toString();
  const endpointHash = await sha256HexBrowser(canonicalEndpoint);
  const deviceLabel = (customDeviceLabel?.trim() || capability.defaultDeviceLabel).slice(0, 80);

  try {
    window.localStorage.setItem(
      LOCAL_PUSH_META_STORAGE_KEY,
      JSON.stringify({
        endpointHash,
        deviceLabel,
        environment: capability.environment,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore localStorage quota errors
  }

  return {
    endpoint: canonicalEndpoint,
    endpointHash,
    keys: { p256dh, auth },
    deviceLabel,
    environment: capability.environment,
  };
}

/**
 * Unsubscribes the current browser from PushManager and detaches the endpoint on the server if authenticated.
 */
export async function detachAndUnsubscribeBrowserPush(options?: {
  notifyServer?: boolean;
}): Promise<void> {
  const notifyServer = options?.notifyServer ?? true;
  let endpointHash: string | null = null;
  let endpointUrl: string | null = null;

  try {
    const sub = await getExistingBrowserPushSubscription();
    if (sub) {
      endpointUrl = sub.endpoint;
      endpointHash = await sha256HexBrowser(new URL(sub.endpoint).toString());
      await sub.unsubscribe().catch(() => undefined);
    }
  } catch {
    // Ignore PushManager access errors
  }

  if (!endpointHash && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_PUSH_META_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { endpointHash?: string };
        if (parsed.endpointHash) {
          endpointHash = parsed.endpointHash;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LOCAL_PUSH_META_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  if (notifyServer && (endpointHash || endpointUrl)) {
    try {
      const client = createNativeApiClient();
      await client.request("/api/v1/study-schedule/push-subscriptions/detach-endpoint", {
        method: "POST",
        body: {
          endpoint: endpointUrl ?? undefined,
          endpointHash: endpointHash ?? undefined,
        },
      });
    } catch {
      // Best-effort server detach during logout/offline teardown
    }
  }
}

// Ensure any local push metadata and browser PushManager subscription are cleaned up on account switch / logout
if (typeof window !== "undefined") {
  registerPrivateCacheClearer(() => {
    void detachAndUnsubscribeBrowserPush({ notifyServer: false });
  });
}
