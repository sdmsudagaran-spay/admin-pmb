const CACHE_NAME = 'smartpmb-cache-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalasi & Caching Aset Visual
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Pembersihan Cache Lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Intersep Request (Bypass Supabase Database)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // ATURAN MUTLAK: Jangan pernah menyentuh atau meng-cache lalu lintas Supabase. 
    // Biarkan data keuangan & pendaftar menembus jaringan secara langsung (Real-Time).
    if (requestUrl.hostname.includes('supabase.co')) {
        return; 
    }

    // Untuk aset UI statis (Logo, CSS, HTML), gunakan sistem Cache First
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Biarkan kosong agar tidak merusak logika aplikasi saat offline
            });
        })
    );
});
