// Aura PWA Service Worker
const CACHE_NAME = 'aura-cache-v4'; // Updated version for offline image support
const FALLBACK_URL = '/'; // Redirect to home page (message list) when offline

// Assets to cache on install (only essential static assets)
const STATIC_ASSETS = [
    '/', // Always cache home page (message list)
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon.ico',
    '/avatars/default-persona.jpg',
    '/avatars/default-user.jpg',
    '/aura.png',
];

// Install event - cache only essential static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Helper function to determine if request is for static asset
function isStaticAsset(url) {
    return url.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/);
}

// Helper function to determine if request is for uploaded content
function isUploadedContent(url) {
    return url.includes('/uploads/');
}

// Helper function to determine if request is for API
function isApiRequest(url) {
    return url.includes('/api/');
}

// Fetch event - use different strategies for different resource types
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome extensions and other schemes
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    // Strategy 1: Cache-first for uploaded images (/uploads/*)
    // This ensures user-uploaded avatars and moment images work offline
    if (isUploadedContent(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Strategy 2: Cache-first for static assets (images, fonts, icons)
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Strategy 3: Network-first for API requests and HTML pages
    // This ensures fresh data when online, falls back to cache when offline
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache successful responses for offline use
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache same-origin requests
                    if (event.request.url.startsWith(self.location.origin)) {
                        // Don't cache API POST/PUT/DELETE responses, only GET
                        if (!isApiRequest(url.pathname) || event.request.method === 'GET') {
                            cache.put(event.request, responseToCache);
                        }
                    }
                });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If navigation request and no cache, redirect to home page (message list)
                    // Home page is always cached, so user can still browse conversations offline
                    if (event.request.mode === 'navigate') {
                        return caches.match(FALLBACK_URL);
                    }
                    return new Response('Network error', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                });
            })
    );
});
