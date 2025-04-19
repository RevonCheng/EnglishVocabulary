// Service Worker for 英文單字學習 PWA

const CACHE_NAME = 'vocabulary-app-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/db.js',
    '/js/spelling.js',
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

// 安裝 Service Worker 並緩存靜態資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('緩存靜態資源');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 攔截網絡請求，優先使用緩存
self.addEventListener('fetch', event => {
    // 跳過不支援的請求（如 chrome-extension://）
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 返回緩存的資源（如果有）
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 否則，發送網絡請求
                return fetch(event.request)
                    .then(response => {
                        // 如果請求失敗，直接返回
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 緩存新的資源
                        let responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
            .catch(() => {
                // 如果匹配失敗並且是HTML頁面請求，返回首頁
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// 後台同步（用於離線添加單字等功能）
self.addEventListener('sync', event => {
    if (event.tag === 'sync-words') {
        event.waitUntil(syncWords());
    }
});

// 模擬後台同步功能（實際功能需要與 IndexedDB 整合）
function syncWords() {
    return new Promise((resolve) => {
        // 這裡應實現實際的同步邏輯
        console.log('執行單字同步');
        resolve();
    });
}

// 推送通知（提醒用戶複習單字）
self.addEventListener('push', event => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || '是時候複習您的英文單字了！',
        icon: '/images/icon-192x192.png',
        badge: '/images/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification('英文單字學習', options)
    );
});

// 點擊通知時的行為
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({
            type: 'window'
        }).then(clientList => {
            // 如果已經有打開的窗口，則聚焦它
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // 否則打開新窗口
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
}); 