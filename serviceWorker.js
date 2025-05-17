/* serviceWorker.js */
// (参考) https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps/Offline_Service_workers
'use strict';

const cacheName = 'bgKifuViewer-v20251517';
const ORIGIN = (location.hostname == 'localhost') ? '' : location.protocol + '//' + location.hostname;

const contentToCache = [
  ORIGIN + '/bgKifuEditor/',
  ORIGIN + '/bgKifuEditor/index.html',
  ORIGIN + '/bgKifuEditor/manifest.json',
  ORIGIN + '/bgKifuEditor/icon/favicon.ico',
  ORIGIN + '/bgKifuEditor/icon/apple-touch-icon.png',
  ORIGIN + '/bgKifuEditor/icon/android-chrome-96x96.png',
  ORIGIN + '/bgKifuEditor/icon/android-chrome-192x192.png',
  ORIGIN + '/bgKifuEditor/icon/android-chrome-512x512.png',
  ORIGIN + '/bgKifuEditor/css/BgKifuEditor.css',
  ORIGIN + '/bgKifuEditor/js/BgMoveStrUtil_class.js',
  ORIGIN + '/bgKifuEditor/js/BgKfInputBoard_class.js',
  ORIGIN + '/bgKifuEditor/js/BgKifu_class.js',
  ORIGIN + '/bgKifuEditor/js/BgKifuEditor_class.js',
  ORIGIN + '/bgKifuEditor/js/BgMoveStrUtil_class.js',
  ORIGIN + '/css/font-awesome-animation.min.css',
  ORIGIN + '/css/bgStaticBoard.css',
  ORIGIN + '/css/FloatWindow4.css',
  ORIGIN + '/js/fontawesome-inuse.min.js',
  ORIGIN + '/js/jquery-3.7.1.min.js',
  ORIGIN + '/js/FloatWindow4.js',
  ORIGIN + '/js/BgChequer_class.js',
  ORIGIN + '/js/BgXgid_class.js',
  ORIGIN + '/js/BgUtil_class.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(contentToCache);
    })
  );
  self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      return r || fetch(e.request).then((response) => {
        return caches.open(cacheName).then((cache) => {
          if (e.request.url.startsWith('http')) { //ignore chrome-extention: request (refuse error msg)
            cache.put(e.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        const [kyappname, kyversion] = key.split('-');
        const [cnappname, cnversion] = cacheName.split('-');
        if (kyappname === cnappname && kyversion !== cnversion) {
          return caches.delete(key);
        }
      }));
    })
  );
});
