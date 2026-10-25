/* Public assets only. Build identity is injected after static export. */
'use strict';
const BUILD_ID = '__PWA_BUILD_ID__';
const CACHE_NAME = `jambprep-public-${BUILD_ID}`;
const ESSENTIALS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/lecterniq-mark.svg'];
const PUBLIC_ASSETS = new Set(ESSENTIALS);

function cacheableRequest(request) {
  if (BUILD_ID.startsWith('__')) return false;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('authorization') || url.origin !== self.location.origin || url.search) return false;
  return PUBLIC_ASSETS.has(url.pathname) || /^\/_next\/static\/.+\.(?:js|css|woff2?)$/.test(url.pathname);
}
function validAsset(response, path) {
  if (!response.ok || response.status !== 200 || response.type === 'opaque') return false;
  if (response.redirected) {
    if (path !== '/offline.html') return false;
    try {
      const finalUrl = new URL(response.url, self.location.origin);
      if (finalUrl.origin !== self.location.origin || finalUrl.pathname.replace(/\/$/, '') !== '/offline') return false;
    } catch {
      return false;
    }
  }
  const mime = response.headers.get('content-type') || '';
  if (path.endsWith('.js')) return /javascript/.test(mime);
  if (path.endsWith('.css')) return mime.includes('text/css');
  if (path.endsWith('.svg')) return mime.includes('image/svg+xml');
  if (path.endsWith('.png')) return mime.includes('image/png');
  if (path.endsWith('.html') || path === '/' || path.endsWith('/')) return mime.includes('text/html');
  return /font|woff|octet-stream/.test(mime);
}
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    if (typeof self.skipWaiting === 'function') {
      const p = self.skipWaiting();
      if (event.waitUntil && p) {
        event.waitUntil(p);
      }
    }
  }
});
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (BUILD_ID.startsWith('__')) return;
    const responses = await Promise.all(ESSENTIALS.map(async path => {
      const response = await fetch(new Request(new URL(path, self.location.origin), { cache: 'reload', credentials: 'omit' }));
      if (!validAsset(response, path)) throw new Error('Required offline asset unavailable');
      if (response.redirected) {
        const body = await response.arrayBuffer();
        return [path, new Response(body, { status: 200, headers: { 'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8' } })];
      }
      return [path, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(responses.map(([path, response]) => cache.put(path, response)));
    try {
      const indexReq = new Request(new URL('/index.html', self.location.origin), { cache: 'reload', credentials: 'omit' });
      const indexRes = await fetch(indexReq);
      if (validAsset(indexRes, '/index.html')) {
        await cache.put('/index.html', indexRes.clone());
        await cache.put('/', indexRes.clone());
      }
    } catch { /* optional app shell prefetch */ }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('jambprep-public-') && name !== CACHE_NAME) await caches.delete(name);
    }
    if (self.clients && typeof self.clients.claim === 'function') {
      await self.clients.claim();
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (cacheableRequest(request)) {
    event.respondWith((async () => {
      let cache;
      try {
        cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
      } catch { /* A denied or evicted cache must not break the network website. */ }
      const response = await fetch(request);
      if (cache && validAsset(response, url.pathname)) {
        try {
        // Bound runtime objects; required assets cannot be evicted by runtime traffic.
        const length = Number(response.headers.get('content-length'));
        const bytes = Number.isFinite(length) && length > 0 ? length : (await response.clone().arrayBuffer()).byteLength;
        if (bytes <= 512 * 1024) {
          await cache.put(request, response.clone());
          const runtime = (await cache.keys()).filter(key => !PUBLIC_ASSETS.has(new URL(key.url).pathname));
          for (const key of runtime.slice(0, Math.max(0, runtime.length - 32))) await cache.delete(key);
        }
        } catch { /* Cache quota/write failure leaves the network response usable. */ }
      }
      return response;
    })());
    return;
  }
  // Document navigation handling with offline resilience
  if (request.mode === 'navigate' && request.method === 'GET' && url.origin === self.location.origin && !request.headers.has('authorization')) {
    if (/^\/(?:api|admin)(?:\/|$)/.test(url.pathname)) return;
    event.respondWith((async () => {
      let cache = null;
      try {
        cache = await caches.open(CACHE_NAME);
      } catch { /* Storage unavailable */ }

      try {
        // Network-first navigation
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque' && cache) {
          try {
            await cache.put(request, networkResponse.clone());
            if (url.pathname) {
              await cache.put(url.pathname, networkResponse.clone());
              const altPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : `${url.pathname}/`;
              if (altPath) {
                await cache.put(altPath, networkResponse.clone());
              }
            }
          } catch { /* Cache write failure */ }
        }
        return networkResponse;
      } catch (networkError) {
        // Network failed (offline, DNS resolution failed, timeout, or connection reset)
        if (cache) {
          try {
            // 1. Try matching the exact requested URL
            let cached = await cache.match(request);
            if (cached) return cached;

            // 2. Try matching the pathname
            cached = await cache.match(url.pathname);
            if (cached) return cached;

            const altPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : `${url.pathname}/`;
            cached = await cache.match(altPath);
            if (cached) return cached;

            // 3. Fall back to cached dashboard or app shell
            cached = await cache.match('/dashboard') || await cache.match('/dashboard/') || await cache.match('/') || await cache.match('/index.html');
            if (cached) return cached;

            // 4. Fall back to offline.html
            const offline = await cache.match('/offline.html');
            if (offline) return offline;
          } catch { /* Storage read failure */ }
        }

        return new Response('You are offline. Reconnect and reload.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
        });
      }
    })());
    return;
  }
});

const DEFAULT_REMINDER_TITLE = 'Time for a little progress';
const DEFAULT_REMINDER_BODY = "Your study goal is waiting. Open JAMBPrep when you're ready.";
const DEFAULT_REMINDER_TAG = 'jambprep-study-reminder';
const ALLOWED_REMINDER_PATHS = new Set(['/practice/', '/dashboard/', '/profile/']);

function resolveSafeReminderNotification(rawPayload) {
  let parsed = null;
  if (rawPayload && typeof rawPayload === 'object') {
    parsed = rawPayload;
  }
  const isStudyReminder = parsed && parsed.type === 'study_reminder';
  const rawTitle = isStudyReminder && typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const rawBody = isStudyReminder && typeof parsed.body === 'string' ? parsed.body.trim() : '';
  const rawUrl = isStudyReminder && typeof parsed.url === 'string' ? parsed.url.trim() : '';

  const title = rawTitle && rawTitle.length <= 80 ? rawTitle : DEFAULT_REMINDER_TITLE;
  const body = rawBody && rawBody.length <= 160 ? rawBody : DEFAULT_REMINDER_BODY;
  const url = ALLOWED_REMINDER_PATHS.has(rawUrl) ? rawUrl : '/practice/';

  return {
    title,
    options: {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: DEFAULT_REMINDER_TAG,
      renotify: false,
      data: { url },
    },
  };
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = null;
    if (event.data) {
      try {
        payload = event.data.json();
      } catch {
        payload = null;
      }
    }
    const notification = resolveSafeReminderNotification(payload);
    await self.registration.showNotification(notification.title, notification.options);
  })());
});

self.addEventListener('notificationclick', event => {
  if (event.notification && typeof event.notification.close === 'function') {
    event.notification.close();
  }
  const rawPath = event.notification && event.notification.data && event.notification.data.url;
  const safePath = ALLOWED_REMINDER_PATHS.has(rawPath) ? rawPath : '/practice/';
  const targetUrl = new URL(safePath, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) continue;
        // Never navigate an active exam or live practice session window away.
        if (/^\/(?:exam|mock)(?:\/|$)/.test(clientUrl.pathname) || /^\/practice\/session(?:\/|$)/.test(clientUrl.pathname)) {
          if (typeof client.focus === 'function') await client.focus();
          return;
        }
      } catch { /* Ignore malformed client URLs. */ }
    }
    for (const client of windowClients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) continue;
        if (clientUrl.pathname !== safePath && typeof client.navigate === 'function') {
          await client.navigate(targetUrl);
        }
        if (typeof client.focus === 'function') await client.focus();
        return;
      } catch { /* Fall through to openWindow. */ }
    }
    if (self.clients && typeof self.clients.openWindow === 'function') {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

