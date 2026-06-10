const CACHE_NAME = 'ultra-clinica-la-salud-v1';
const APP_SHELL = [
  './',
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
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    if (response.ok && new URL(event.request.url).origin === location.origin) caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
