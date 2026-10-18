import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')).replace('__PWA_BUILD_ID__', 'test-build');
function harness(fetchImpl = async () => new Response('asset', { headers: { 'Content-Type': 'application/javascript' } }), clientList = []) {
  const handlers = {};
  const stored = new Map();
  const shownNotifications = [];
  const openedWindows = [];
  const cache = { match: async key => stored.get(typeof key === 'string' ? key : new URL(key.url).pathname), put: async (key, response) => stored.set(typeof key === 'string' ? key : new URL(key.url).pathname, response), keys: async () => [...stored.keys()].map(key => new Request('https://app.test' + key)), delete: async key => stored.delete(new URL(key.url).pathname) };
  const context = {
    URL,
    Request,
    Response,
    Set,
    fetch: fetchImpl,
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    self: {
      location: { origin: 'https://app.test' },
      addEventListener: (name, fn) => { handlers[name] = fn; },
      registration: {
        showNotification: async (title, options) => {
          shownNotifications.push({ title, options });
        },
      },
      clients: {
        matchAll: async () => clientList,
        openWindow: async (url) => {
          openedWindows.push(url);
          return { url };
        },
      },
    },
  };
  vm.runInNewContext(source, context);
  function intercept(path, init = {}, mode) {
    const request = new Request(new URL(path, 'https://app.test'), init);
    let response;
    const wrapped = mode ? { url: request.url, method: request.method, headers: request.headers, mode } : request;
    handlers.fetch({ request: wrapped, respondWith: value => { response = value; } });
    return response;
  }
  return { handlers, intercept, stored, context, shownNotifications, openedWindows };
}
test('private, financial, auth, cross-origin, RSC and mutation requests bypass public caching', () => {
  const h = harness();
  for (const path of ['/api/v1/profile', '/api/v1/exams/attempts/a', '/checkout/verify/?reference=a', '/reset-password/?code=a', '/dashboard/?_rsc=a', 'https://other.test/icon-192.png']) assert.equal(h.intercept(path), undefined, path);
  assert.equal(h.intercept('/icon-192.png', { headers: { Authorization: 'Bearer private' } }), undefined);
  assert.equal(h.intercept('/api/v1/auth/session', { method: 'POST', body: '{}' }), undefined);
  assert.equal(h.intercept('/api/missing', {}, 'navigate'), undefined);
  assert.equal(h.intercept('/admin/', {}, 'navigate'), undefined);
});
test('public hashed asset is cached, subsequent request avoids network', async () => {
  let calls = 0;
  const h = harness(async () => { calls++; return new Response('code', { headers: { 'Content-Type': 'application/javascript' } }); });
  assert.equal(await (await h.intercept('/_next/static/chunks/a.js')).text(), 'code');
  assert.equal(await (await h.intercept('/_next/static/chunks/a.js')).text(), 'code');
  assert.equal(calls, 1);
});
test('invalid MIME and failed assets cannot poison script cache', async () => {
  for (const response of [new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), new Response('unavailable', { status: 503 })]) {
    const h = harness(async () => response);
    await h.intercept('/_next/static/chunks/a.js');
    assert.equal(h.stored.size, 0);
  }
});
test('offline document fallback is generic and never a cached account response', async () => {
  const h = harness(async () => { throw new TypeError('offline'); });
  h.stored.set('/offline.html', new Response('generic offline screen'));
  assert.equal(await (await h.intercept('/dashboard/', {}, 'navigate')).text(), 'generic offline screen');
  assert.equal(h.stored.size, 1);
});
test('online documents preserve real status and are never cached', async () => {
  const h = harness(async () => new Response('not found', { status: 404 }));
  assert.equal((await h.intercept('/missing/', {}, 'navigate')).status, 404);
  assert.equal(h.stored.size, 0);
});
test('runtime cache stays bounded while keeping required assets', async () => {
  const h = harness();
  h.stored.set('/offline.html', new Response('offline'));
  for (let i = 0; i < 40; i++) await h.intercept(`/_next/static/chunks/${i}.js`);
  assert.equal(h.stored.size, 33);
  assert.ok(h.stored.has('/offline.html'));
});
test('manifest identity supports standalone installation without changing origin', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/site.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.id, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.display, 'standalone');
  assert.equal(new URL(manifest.start_url, 'https://app.test').origin, 'https://app.test');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
});

test('cache storage failures do not block a successful network response', async () => {
  const h = harness();
  h.context.caches.open = async () => { throw new Error('Storage denied'); };
  assert.equal((await h.intercept('/_next/static/chunks/a.js')).status, 200);
});

test('push handler displays generic reminder and sanitizes malformed or untrusted payloads', async () => {
  const h = harness();
  let promise;
  h.handlers.push({
    data: { json: () => ({ type: 'study_reminder', title: 'Time for a little progress', body: "Your study goal is waiting. Open JAMBPrep when you're ready.", url: '/practice/' }) },
    waitUntil: p => { promise = p; },
  });
  await promise;
  assert.equal(h.shownNotifications.length, 1);
  assert.equal(h.shownNotifications[0].title, 'Time for a little progress');
  assert.equal(h.shownNotifications[0].options.tag, 'jambprep-study-reminder');
  assert.equal(h.shownNotifications[0].options.data.url, '/practice/');

  // Malformed JSON or disallowed URL falls back to safe generic notification
  h.handlers.push({
    data: { json: () => { throw new SyntaxError('bad json'); } },
    waitUntil: p => { promise = p; },
  });
  await promise;
  assert.equal(h.shownNotifications.length, 2);
  assert.equal(h.shownNotifications[1].title, 'Time for a little progress');
  assert.equal(h.shownNotifications[1].options.data.url, '/practice/');
});

test('notificationclick never navigates an active exam window away and opens safe relative path otherwise', async () => {
  let examFocused = false;
  let examNavigated = false;
  const activeExamClient = {
    url: 'https://app.test/exam/attempt-123',
    focus: async () => { examFocused = true; },
    navigate: async () => { examNavigated = true; },
  };
  const hExam = harness(undefined, [activeExamClient]);
  let closed = false;
  let clickPromise;
  hExam.handlers.notificationclick({
    notification: {
      data: { url: 'https://evil.example/phish' },
      close: () => { closed = true; },
    },
    waitUntil: p => { clickPromise = p; },
  });
  await clickPromise;
  assert.equal(closed, true);
  assert.equal(examFocused, true);
  assert.equal(examNavigated, false);
  assert.equal(hExam.openedWindows.length, 0);

  // When no window is open, opens canonical /practice/ destination
  const hEmpty = harness(undefined, []);
  hEmpty.handlers.notificationclick({
    notification: {
      data: { url: 'https://evil.example/phish' },
      close: () => {},
    },
    waitUntil: p => { clickPromise = p; },
  });
  await clickPromise;
  assert.deepEqual(hEmpty.openedWindows, ['https://app.test/practice/']);
});

test('install accepts Cloudflare Pages canonical /offline.html -> /offline redirect and rejects login redirects', async () => {
  const h = harness(async (req) => {
    const pathname = new URL(req.url, 'https://app.test').pathname;
    if (pathname === '/offline.html') {
      const res = new Response('<html>offline</html>', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      Object.defineProperty(res, 'redirected', { value: true });
      Object.defineProperty(res, 'url', { value: 'https://app.test/offline' });
      return res;
    }
    if (pathname.endsWith('.png')) {
      return new Response('png', { status: 200, headers: { 'Content-Type': 'image/png' } });
    }
    return new Response('<svg/>', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
  });
  let installPromise;
  h.handlers.install({ waitUntil: p => { installPromise = p; } });
  await installPromise;
  assert.ok(h.stored.has('/offline.html'));
  assert.equal(h.stored.get('/offline.html').redirected, false);

  // Redirect to /login must still fail install
  const hBad = harness(async (req) => {
    const pathname = new URL(req.url, 'https://app.test').pathname;
    if (pathname === '/offline.html') {
      const res = new Response('<html>login</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      Object.defineProperty(res, 'redirected', { value: true });
      Object.defineProperty(res, 'url', { value: 'https://app.test/login' });
      return res;
    }
    return new Response('png', { status: 200, headers: { 'Content-Type': 'image/png' } });
  });
  let badPromise;
  hBad.handlers.install({ waitUntil: p => { badPromise = p; } });
  await assert.rejects(badPromise, /Required offline asset unavailable/);
});


