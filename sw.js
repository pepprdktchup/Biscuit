// Biscuit service worker
// Bump CACHE_VERSION whenever you ship a meaningful update so old caches get cleared.
const CACHE_VERSION = 'biscuit-v13';
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Bail immediately for cross-origin requests — never call respondWith on these
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // Network-first for navigation requests so deployed updates show up immediately when online.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'Biscuit', body: event.data.text() }; }

  const title   = data.title || 'Biscuit';
  const options = {
    body:               data.body || '',
    icon:               data.icon || './icon-192.png',
    badge:              './icon-192.png',
    tag:                data.eventId || 'biscuit-reminder',
    renotify:           true,
    requireInteraction: false,
    data:               { eventId: data.eventId },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap notification → bring app to foreground (or open it)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      return clients.openWindow('./');
    })
  );
});
