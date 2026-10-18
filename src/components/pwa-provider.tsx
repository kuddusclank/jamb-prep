'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './pwa-provider.module.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const COOLDOWN = 14 * 24 * 60 * 60 * 1000;
export default function PwaProvider() {
  const pathname = usePathname();
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [manual, setManual] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)');
    const detect = () => setStandalone(mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    detect();
    mode.addEventListener('change', detect);
    try { setDismissed(Date.now() - Number(localStorage.getItem('jambprep_install_dismissed') || 0) < COOLDOWN); } catch { /* Installation remains optional when storage is unavailable. */ }
    setManual(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const onInstalled = () => { setStandalone(true); setInstall(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    let active = true;
    const workerCleanups: Array<() => void> = [];
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
        if (!active) return;
        if (registration.waiting) setUpdate(true);
        const onFound = () => {
          const worker = registration.installing;
          if (!worker) return;
          const changed = () => { if (active && worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(true); };
          worker.addEventListener('statechange', changed);
          workerCleanups.push(() => worker.removeEventListener('statechange', changed));
        };
        registration.addEventListener('updatefound', onFound);
        workerCleanups.push(() => registration.removeEventListener('updatefound', onFound));
      }).catch(() => { /* Failed offline preparation must not block the website. */ });
    }
    return () => { active = false; workerCleanups.forEach(cleanup => cleanup()); mode.removeEventListener('change', detect); window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const safePage = ['/', '/dashboard', '/profile'].includes(pathname.replace(/\/$/, '') || '/');
  if (!safePage || (!update && (standalone || dismissed || (!install && !manual)))) return null;
  async function beginInstall() {
    if (!install) { setInstructions(true); return; }
    const event = install;
    setInstall(null);
    try { await event.prompt(); const result = await event.userChoice; if (result.outcome === 'dismissed') dismiss(); }
    catch { setInstructions(true); }
  }
  function dismiss() {
    setDismissed(true); setUpdate(false); setInstructions(false);
    try { localStorage.setItem('jambprep_install_dismissed', String(Date.now())); } catch { /* No persistence required. */ }
  }
  return <aside className={styles.notice} aria-label="JAMBPrep app">
    <button className={styles.close} onClick={dismiss} aria-label="Dismiss app notice">×</button>
    {update ? <p>An update is ready. It will apply after all JAMBPrep windows are closed and reopened. Finish and sync your session first.</p> : <>
      <p>Keep JAMBPrep close. Add it to your home screen.</p>
      {instructions ? <p>On iPhone or iPad, open your browser’s Share menu and choose Add to Home Screen. On supported Mac Safari, use File → Add to Dock. If you are inside WhatsApp, open this link in your browser first.</p> : <button className={styles.install} onClick={() => void beginInstall()}>Add JAMBPrep</button>}
    </>}
  </aside>;
}
