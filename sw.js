const CACHE = 'bongo-cat-mobile-v3';
const ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/multiplayer.js',
  'js/vendor/mqtt.min.js',
  'manifest.webmanifest',
  'icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선 — 항상 최신 버전을 받고, 오프라인일 때만 캐시로 동작
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
