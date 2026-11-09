// Service worker: cache the app shell so it works offline and feels native.
const CACHE = 'household-v57';
const ASSETS = [
  './assets/household-logo-finance.svg',
  './theme.css',
  './',
  './index.html',
  './app.js',
  './views.js',
  './vault.js',
  './encrypted-vault/google-drive.js',
  './encrypted-vault/document-links.js',
  './encrypted-vault/actors.js',
  './encrypted-vault/credential-form.js',
  './encrypted-vault/membership.js',
  './encrypted-vault/recovery.js',
  './encrypted-vault/workflow.js',
  './encrypted-vault/index.html',
  './encrypted-vault/household-demo.kdbx',
  './encrypted-vault/google-config.js',
  './encrypted-vault/prototype.js',
  './encrypted-vault/style.css',
  './encrypted-vault/reader.js',
  './encrypted-vault/drive-sync.js',
  './encrypted-vault/sw.js',
  './encrypted-vault/storage.js',
  './encrypted-vault/vendor/LICENSE',
  './encrypted-vault/vendor/hash-wasm-LICENSE',
  './encrypted-vault/vendor/kdbxweb.min.js',
  './encrypted-vault/vendor/argon2.umd.min.js',

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
      Promise.all(keys.filter((k) => /^household-v\d+$/.test(k) && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for app shell; network fallback otherwise.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  if(new URL(e.request.url).pathname.includes('/encrypted-vault/')) return;
  // Never cache sync API traffic — it must always be live.
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    if(['localhost','127.0.0.1'].includes(self.location.hostname))return fetch(e.request).catch(()=>cache.match(e.request));
    return (await cache.match(e.request))||fetch(e.request);
  }));
});
