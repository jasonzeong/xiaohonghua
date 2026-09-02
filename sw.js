/* 小红花银行 PWA Service Worker
   策略：
     HTML（导航）  → Network First，在线永远拿最新版，断网回退缓存
     静态资源      → Cache First + 后台更新（Stale While Revalidate）
     jsonbin.io    → 不拦截，API 请求必须走网络

   升级改版时：把 VERSION 改成新值即可强制全量刷新缓存
*/

const VERSION = 'xiaohonghua-v2.1';
const CACHE = VERSION;
const SHELL = './index.html';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/maskable-512.svg',
  './icons/favicon.svg'
];

// 安装 → 预缓存核心资源
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (u) {
          return cache.add(new Request(u, { cache: 'reload' })).catch(function () {
            /* 单个资源失败不阻塞安装 */
          });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

// 激活 → 清理旧版本缓存
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// 主动刷新已打开的页面（配合页面上的「新版本可用」提示）
self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.hostname === 'jsonbin.io' || url.hostname === 'api.jsonbin.io') return;
  if (url.pathname.indexOf('/sw.js') !== -1) return;   // SW 自身永远走网络

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  // ---- HTML：网络优先，保证永远拿到最新版；断网才用缓存 ----
  if (isHTML) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(SHELL, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match(SHELL).then(function (hit) {
          return hit || new Response(
            '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font-family:sans-serif;text-align:center;padding:80px 20px;background:#fff9fb">' +
            '<div style="font-size:60px">🌺</div><h2>当前无网络</h2>' +
            '<p style="color:#888;line-height:1.8">小红花银行需要联网打开一次<br>之后就能离线使用了</p></body>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
    );
    return;
  }

  // ---- 静态资源：缓存优先 + 后台静默更新 ----
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) { fetchAndCache(req); return cached; }
      return fetchAndCache(req);
    }).catch(function () {
      return new Response('', { status: 503 });
    })
  );
});

function fetchAndCache(req) {
  return fetch(req).then(function (res) {
    if (!res || res.status !== 200 || res.type !== 'basic') return res;
    const clone = res.clone();
    caches.open(CACHE).then(function (cache) { cache.put(req, clone); });
    return res;
  });
}
