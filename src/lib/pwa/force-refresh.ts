/**
 * Hard-refreshes the PWA by updating service workers, clearing obsolete
 * public cache entries, and forcing a clean network reload.
 */
export async function forcePwaReload(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Instruct any waiting or active service workers to skip waiting
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        await reg.update().catch(() => undefined);
      }
    }

    // 2. Clear stale public application asset caches
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith("jambprep-public-")) {
          await caches.delete(key).catch(() => undefined);
        }
      }
    }

    // 3. Clear cached active build identity
    try {
      localStorage.removeItem("jambprep_active_build_id");
    } catch {
      // Storage error ignored
    }
  } catch {
    // Best-effort cleanup
  } finally {
    // 4. Force reload from the server
    window.location.reload();
  }
}
