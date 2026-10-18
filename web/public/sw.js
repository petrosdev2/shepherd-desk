/* Shepherd Desk service worker — lets the app open with no network.
 *
 * Only the app shell is cached: the HTML for "/" and the hashed build assets.
 * Church records are not cached here; they live in IndexedDB, written by the
 * store. The public registration page is never cached — it needs the network
 * anyway, and a stranger's half-filled form should not sit on the device.
 */
const CACHE = 'shepherd-desk-v1';
const SHELL = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page tells us which build assets it actually used, so the first visit
// leaves behind everything a later offline open needs. Their names are
// content-hashed, so a stale entry is impossible.
self.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.type !== 'precache' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    d.urls.slice(0, 120).map(u => c.match(u).then(hit => hit || c.add(u).catch(() => {})))
  )));
});

const cacheable = url =>
  url.origin === self.location.origin &&
  !url.pathname.startsWith('/join/') &&
  !url.pathname.startsWith('/api/');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;                      // straight to the network

  // Build assets are content-hashed, so a cached copy is always correct.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Pages: prefer the network so updates land, fall back to the last good copy.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res; })
        .catch(() => caches.match('/').then(hit => hit || new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font:16px system-ui;padding:32px">Shepherd Desk is offline and has no saved copy on this device yet. Open it once with a connection.</body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )))
    );
  }
});
