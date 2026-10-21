'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import styles from './pwa-provider.module.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const COOLDOWN = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_BUILD_STORAGE_KEY = 'jambprep_active_build_id';

export default function PwaProvider() {
  const pathname = usePathname();
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [manual, setManual] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [update, setUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1. Recover from broken webpack chunks on new deployment
    const onChunkError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (/Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(msg)) {
        const lastReload = Number(sessionStorage.getItem('jambprep_last_chunk_reload') || 0);
        if (Date.now() - lastReload > 15000) {
          sessionStorage.setItem('jambprep_last_chunk_reload', String(Date.now()));
          window.location.reload();
        }
      }
    };
    window.addEventListener('error', onChunkError);

    // 2. Standalone / Installation detection
    const mode = window.matchMedia('(display-mode: standalone)');
    const detect = () =>
      setStandalone(mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    detect();
    mode.addEventListener('change', detect);

    try {
      setDismissed(Date.now() - Number(localStorage.getItem('jambprep_install_dismissed') || 0) < COOLDOWN);
    } catch {
      // Storage unavailable
    }
    setManual(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstall(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    let active = true;
    const workerCleanups: Array<() => void> = [];

    // 3. Service Worker registration, automatic checks, and update listening
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      const onControllerChange = () => {
        if (!active || refreshing) return;
        // Never interrupt an active exam
        if (window.location.pathname.startsWith('/exam')) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      workerCleanups.push(() => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange));

      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          if (!active) return;
          registrationRef.current = registration;

          if (registration.waiting) {
            setUpdate(true);
          }

          const onFound = () => {
            const worker = registration.installing;
            if (!worker) return;
            const changed = () => {
              if (active && worker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdate(true);
              }
            };
            worker.addEventListener('statechange', changed);
            workerCleanups.push(() => worker.removeEventListener('statechange', changed));
          };
          registration.addEventListener('updatefound', onFound);
          workerCleanups.push(() => registration.removeEventListener('updatefound', onFound));

          // Proactive background update check
          void registration.update().catch(() => undefined);
        })
        .catch(() => undefined);

      // Periodically check for updates (every 10 minutes) & on tab focus
      const checkUpdate = async () => {
        try {
          const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              setUpdate(true);
            }
          }

          // Build ID handshake check
          const res = await fetch('/pwa-build.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as { buildId?: string };
            if (data?.buildId) {
              const currentBuildId = localStorage.getItem(ACTIVE_BUILD_STORAGE_KEY);
              if (!currentBuildId) {
                localStorage.setItem(ACTIVE_BUILD_STORAGE_KEY, data.buildId);
              } else if (currentBuildId !== data.buildId) {
                setUpdate(true);
              }
            }
          }
        } catch {
          // Offline
        }
      };

      const onVisibility = () => {
        if (document.visibilityState === 'visible') {
          void checkUpdate();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      workerCleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

      const interval = setInterval(checkUpdate, 10 * 60 * 1000);
      workerCleanups.push(() => clearInterval(interval));
    }

    return () => {
      active = false;
      workerCleanups.forEach((cleanup) => cleanup());
      mode.removeEventListener('change', detect);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('error', onChunkError);
    };
  }, []);

  // Check on route changes (except during active exams)
  useEffect(() => {
    if ('serviceWorker' in navigator && !pathname.startsWith('/exam')) {
      void registrationRef.current?.update().catch(() => undefined);
    }
  }, [pathname]);

  const inExam = pathname.startsWith('/exam');
  const safePage = ['/', '/dashboard', '/profile'].includes(pathname.replace(/\/$/, '') || '/');

  // If update is ready, show it anywhere outside /exam
  if (inExam) return null;
  if (!update && (!safePage || (standalone || dismissed || (!install && !manual)))) return null;

  async function beginInstall() {
    if (!install) {
      setInstructions(true);
      return;
    }
    const event = install;
    setInstall(null);
    try {
      await event.prompt();
      const result = await event.userChoice;
      if (result.outcome === 'dismissed') dismiss();
    } catch {
      setInstructions(true);
    }
  }

  function dismiss() {
    setDismissed(true);
    setUpdate(false);
    setInstructions(false);
    try {
      localStorage.setItem('jambprep_install_dismissed', String(Date.now()));
    } catch {
      // Storage error ignored
    }
  }

  async function applyUpdate() {
    setIsUpdating(true);
    try {
      const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Purge public caches
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.startsWith('jambprep-public-')) {
            await caches.delete(k);
          }
        }
      }

      // Fetch the latest build ID and sync storage
      try {
        const res = await fetch('/pwa-build.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { buildId?: string };
          if (data?.buildId) {
            localStorage.setItem(ACTIVE_BUILD_STORAGE_KEY, data.buildId);
          }
        }
      } catch {
        // Ignore
      }
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  }

  return (
    <aside className={styles.notice} aria-label="JAMBPrep app notification">
      <button className={styles.close} onClick={dismiss} aria-label="Dismiss app notice">
        ×
      </button>
      {update ? (
        <div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>New version available</p>
          <p style={{ fontSize: 13, color: '#52636b', marginBottom: 12 }}>
            A fresh update of JAMBPrep has been deployed with latest features and fixes.
          </p>
          <button
            className={styles.install}
            onClick={() => void applyUpdate()}
            disabled={isUpdating}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            {isUpdating ? 'Updating...' : 'Update & Reload Now'}
          </button>
        </div>
      ) : (
        <>
          <p>Keep JAMBPrep close. Add it to your home screen.</p>
          {instructions ? (
            <p>
              On iPhone or iPad, open your browser’s Share menu and choose Add to Home Screen. On
              supported Mac Safari, use File → Add to Dock. If you are inside WhatsApp, open this link
              in your browser first.
            </p>
          ) : (
            <button className={styles.install} onClick={() => void beginInstall()}>
              Add JAMBPrep
            </button>
          )}
        </>
      )}
    </aside>
  );
}
