// Service worker: cache the app shell so it works offline and feels native.
const CACHE = 'household-v26';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './views.js',
  './savings.js',
  './institutions.js',
  './assets/institutions/au.png',
  './assets/institutions/axis.ico',
  './assets/institutions/bom.ico',
  './assets/institutions/canara.png',
  './assets/institutions/hdfc.ico',
  './assets/institutions/icici.ico',
  './assets/institutions/idfc.ico',
  './assets/institutions/iob.png',
  './assets/institutions/kotak.ico',
  './assets/institutions/pnb.ico',
  './assets/institutions/shivalik.ico',
  './assets/institutions/slice.ico',
  './assets/institutions/sbi.ico',
  './assets/institutions/ujjivan.ico',
  './assets/institutions/unity.png',
  './assets/institutions/utkarsh.png',
  './assets/institutions/angel.ico',
  './assets/institutions/groww.ico',
  './assets/institutions/hdfcsec.ico',
  './assets/institutions/icicidirect.png',
  './assets/institutions/upstox.ico',
  './assets/institutions/zerodha.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './inter.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for app shell; network fallback otherwise.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Never cache sync API traffic — it must always be live.
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});
