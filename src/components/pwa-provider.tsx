'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, RefreshCw, Download, WifiOff, Zap, Smartphone } from 'lucide-react';
import styles from './pwa-provider.module.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const COOLDOWN = 3 * 24 * 60 * 60 * 1000; // 3-day cooldown when dismissed
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
  const [visible, setVisible] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const latestBuildIdRef = useRef<string | null>(null);

  // Smooth entrance delay after page load
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

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
            const justReloaded = sessionStorage.getItem('jambprep_sw_reloaded');
            if (justReloaded && Date.now() - Number(justReloaded) < 30000) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
              setUpdate(true);
            }
          }

          const onFound = () => {
            const worker = registration.installing;
            if (!worker) return;
            const changed = () => {
              if (active && worker.state === 'installed' && navigator.serviceWorker.controller) {
                const justReloaded = sessionStorage.getItem('jambprep_sw_reloaded');
                if (justReloaded && Date.now() - Number(justReloaded) < 30000) {
                  worker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  setUpdate(true);
                }
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
              const justReloaded = sessionStorage.getItem('jambprep_sw_reloaded');
              if (!justReloaded || Date.now() - Number(justReloaded) >= 30000) {
                setUpdate(true);
              }
            }
          }

          // Build ID handshake check
          const res = await fetch('/pwa-build.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as { buildId?: string };
            if (data?.buildId) {
              latestBuildIdRef.current = data.buildId;
              const currentBuildId = localStorage.getItem(ACTIVE_BUILD_STORAGE_KEY);
              if (!currentBuildId) {
                localStorage.setItem(ACTIVE_BUILD_STORAGE_KEY, data.buildId);
              } else if (currentBuildId !== data.buildId) {
                const reloadedForBuild = sessionStorage.getItem('jambprep_reloaded_build_' + data.buildId);
                const dismissedForBuild = Number(localStorage.getItem('jambprep_update_dismissed_' + data.buildId) || 0);
                if (!reloadedForBuild && (Date.now() - dismissedForBuild > 2 * 60 * 60 * 1000)) {
                  setUpdate(true);
                }
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
  const isExcluded = inExam || pathname.startsWith('/admin') || pathname.startsWith('/checkout');

  if (isExcluded) return null;
  if (!visible) return null;
  if (!update && (standalone || dismissed || (!install && !manual))) return null;

  async function beginInstall() {
    if (!install) {
      setInstructions(true);
      return;
    }
    const event = install;
    try {
      await event.prompt();
      const result = await event.userChoice;
      if (result.outcome === 'accepted') {
        setStandalone(true);
        setInstall(null);
      } else {
        dismiss();
      }
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
      if (latestBuildIdRef.current) {
        localStorage.setItem('jambprep_update_dismissed_' + latestBuildIdRef.current, String(Date.now()));
      }
    } catch {
      // Storage error ignored
    }
  }

  async function applyUpdate() {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdate(false);

    try {
      // 1. Fetch latest build ID and sync to storage FIRST
      let newBuildId = latestBuildIdRef.current;
      try {
        const res = await fetch('/pwa-build.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { buildId?: string };
          if (data?.buildId) {
            newBuildId = data.buildId;
          }
        }
      } catch {
        // Storage sync error ignored
      }

      if (newBuildId) {
        localStorage.setItem(ACTIVE_BUILD_STORAGE_KEY, newBuildId);
        sessionStorage.setItem('jambprep_reloaded_build_' + newBuildId, '1');
      }
      sessionStorage.setItem('jambprep_sw_reloaded', String(Date.now()));

      // 2. Clear stale public caches
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          for (const k of keys) {
            if (k.startsWith('jambprep-public-')) {
              await caches.delete(k);
            }
          }
        } catch {
          // Cache delete error ignored
        }
      }

      // 3. Post SKIP_WAITING to waiting worker and wait for controllerchange or timeout
      const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
      if (reg?.waiting) {
        let reloaded = false;
        const onCtrl = () => {
          if (!reloaded) {
            reloaded = true;
            window.location.reload();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', onCtrl, { once: true });
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Fallback reload if controllerchange doesn't fire within 400ms
        setTimeout(() => {
          if (!reloaded) {
            reloaded = true;
            window.location.reload();
          }
        }, 400);
        return;
      }

      // 4. If no waiting worker, reload directly
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  return (
    <>
      {/* Mobile Drawer Overlay when Install is available */}
      {!update && install && <div className={styles.overlay} onClick={dismiss} />}

      <aside className={styles.notice} aria-label="JAMBPrep app notification">
        <div className={styles.grabBar} />
        <button className={styles.close} onClick={dismiss} aria-label="Dismiss app notice">
          <X size={18} />
        </button>

        {update ? (
          <div>
            <div className={styles.headerRow}>
              <img src="/icon-192.png" alt="JAMBPrep" className={styles.appIcon} />
              <div className={styles.titleArea}>
                <span className={styles.badge}>Update Ready</span>
                <h3 className={styles.title}>New Version Available</h3>
                <p className={styles.desc}>Latest improvements and offline fixes deployed.</p>
              </div>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.installBtn}
                onClick={() => void applyUpdate()}
                disabled={isUpdating}
              >
                <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
                <span>{isUpdating ? 'Updating...' : 'Update & Reload Now'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className={styles.headerRow}>
              <img src="/icon-192.png" alt="JAMBPrep App" className={styles.appIcon} />
              <div className={styles.titleArea}>
                <span className={styles.badge}>Official UTME App</span>
                <h3 className={styles.title}>Install JAMBPrep</h3>
                <p className={styles.desc}>Fast, full-screen offline practice.</p>
              </div>
            </div>

            {instructions ? (
              <div className={styles.instructionsBox}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Apple Safari / iOS Instructions:</p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Tap the <strong>Share</strong> button (box with arrow) at the bottom.</li>
                  <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner.</li>
                </ol>
              </div>
            ) : (
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <WifiOff size={15} className={styles.featureIcon} />
                  <span>Works 100% offline without mobile data</span>
                </div>
                <div className={styles.featureItem}>
                  <Zap size={15} className={styles.featureIcon} />
                  <span>Instant question navigation & practice packs</span>
                </div>
                <div className={styles.featureItem}>
                  <Smartphone size={15} className={styles.featureIcon} />
                  <span>Fullscreen authentic CBT simulation</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button
                className={styles.installBtn}
                onClick={() => void beginInstall()}
              >
                <Download size={17} />
                <span>{install ? 'Install App (1-Tap)' : 'How to Add to Home Screen'}</span>
              </button>
              <button className={styles.dismissBtn} onClick={dismiss}>
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
