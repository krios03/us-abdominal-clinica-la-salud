const CACHE_NAME = 'ultra-clinica-la-salud-v2-20260610165340';
const APP_SHELL = [
  './index.html',
  './obstetrico.html',
  './mama.html',
  './pelvico.html',
  './prostatico.html',
  './partes-blandas.html',
  './manifest.webmanifest',
  './assets/logo-clinica-la-salud.png',
  './assets/icono-ultrasonido.png',
  './assets/pwa-icon-192.png',
  './assets/pwa-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match('./index.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event.request));
});