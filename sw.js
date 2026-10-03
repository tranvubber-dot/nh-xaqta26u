// Ngân Hà Của Con — service worker (chạy offline). Ảnh/video của bạn KHÔNG đi qua đây: chúng nằm trong IndexedDB của máy.
const VERSION = '1.4.3';
const CACHE = 'nganha-' + VERSION;
const CORE = ['./', 'index.html', 'app.js', 'nhatky.js', 'ui.js', 'dongthoigian.js', 'hoso.js', 'hoso-data.js', 'nhac.js', 'modau.js', 'manifest.webmanifest', 'lib/three.module.min.js', 'fonts/Quicksand.ttf',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('nganha-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  const fresh = req.mode === 'navigate' || /\.(html|js|mjs|webmanifest)$/.test(p) || p.endsWith('/');
  if (fresh) {
    // mạng trước (để luôn có bản mới), mất mạng thì lấy bản đã lưu
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
  }
});
