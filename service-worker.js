const CACHE_NAME = 'twin-oil-rice-v2';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
// 這些是外部 CDN 資源（React 本體、Babel 轉譯器）。第一次打開 App 時需要
// 從網路下載，之後就會被快取起來，下次打開不用再重新下載，開啟速度會快很多。
const CDN_SHELL = [
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://esm.sh/lucide-react@0.383.0?external=react',
  'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // App 本體一定要快取成功；CDN 資源盡量快取，失敗也不影響安裝（例如剛好斷網）。
      return cache.addAll(APP_SHELL).then(() =>
        Promise.all(CDN_SHELL.map((url) => cache.add(url).catch(() => {})))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 本機檔案（app.js、index.html...）：network-first，這樣改版後很快就能抓到最新版；
// 沒網路時退回快取。
// CDN 資源（React、Babel）：cache-first，第一次載入後就直接用快取，開啟速度大幅加快，
// 不用每次都重新下載這些檔案。
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    if (CDN_SHELL.some((cdnUrl) => event.request.url === cdnUrl || event.request.url.startsWith(cdnUrl.split('?')[0]))) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return res;
          });
        })
      );
    }
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
