const CACHE_NAME = 'staff-schedule-v2'
const STATIC_CACHE_NAME = 'staff-schedule-static-v2'
const IMAGE_CACHE_NAME = 'staff-schedule-images-v1'
const API_CACHE_NAME = 'staff-schedule-api-v1'

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  API: 5 * 60 * 1000,      // 5 minutes for API data
  IMAGES: 24 * 60 * 60 * 1000, // 24 hours for images
  STATIC: 7 * 24 * 60 * 60 * 1000 // 7 days for static assets
}

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/staff-schedule',
  '/manifest.json',
  '/favicon.ico'
]

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/staff-schedule\/staff/, ttl: CACHE_TTL.API, strategy: 'networkFirst' },
  { pattern: /\/api\/staff-schedule\/schedules/, ttl: CACHE_TTL.API, strategy: 'networkFirst' },
  { pattern: /\/api\/staff-schedule\/team/, ttl: CACHE_TTL.API, strategy: 'networkFirst' }
]

// Image patterns for optimization
const IMAGE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /\/api\/.*\/photo/,
  /\/images\//
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(API_CACHE_NAME),
      caches.open(IMAGE_CACHE_NAME)
    ]).then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const expectedCaches = [CACHE_NAME, STATIC_CACHE_NAME, IMAGE_CACHE_NAME, API_CACHE_NAME]
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((cacheName) => !expectedCaches.includes(cacheName))
              .map((cacheName) => caches.delete(cacheName))
          )
        }),
      // Clean up expired cache entries
      cleanExpiredCacheEntries()
    ]).then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    const apiConfig = API_CACHE_PATTERNS.find(config => 
      config.pattern.test(url.pathname)
    )

    if (apiConfig) {
      event.respondWith(
        networkFirstWithTTL(request, API_CACHE_NAME, apiConfig.ttl)
      )
    } else {
      // For other APIs, try network first, no cache fallback
      event.respondWith(fetch(request))
    }
    return
  }

  // Handle images
  if (request.destination === 'image' || IMAGE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      cacheFirstWithTTL(request, IMAGE_CACHE_NAME, CACHE_TTL.IMAGES)
    )
    return
  }

  // Handle static assets
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(
      cacheFirstWithTTL(request, STATIC_CACHE_NAME, CACHE_TTL.STATIC)
    )
    return
  }

  // Default: try network first
  event.respondWith(fetch(request))
})

// Utility functions for cache management
function isExpired(response, ttl) {
  const cachedTime = response.headers.get('sw-cached-time')
  if (!cachedTime) return true
  
  const age = Date.now() - parseInt(cachedTime)
  return age > ttl
}

function addCacheHeaders(response) {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
  
  newResponse.headers.set('sw-cached-time', Date.now().toString())
  return newResponse
}

// Clean expired cache entries
async function cleanExpiredCacheEntries() {
  const cacheNames = [API_CACHE_NAME, IMAGE_CACHE_NAME, STATIC_CACHE_NAME]
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      
      for (const request of requests) {
        const response = await cache.match(request)
        if (response) {
          const ttl = cacheName === API_CACHE_NAME ? CACHE_TTL.API :
                     cacheName === IMAGE_CACHE_NAME ? CACHE_TTL.IMAGES :
                     CACHE_TTL.STATIC
          
          if (isExpired(response, ttl)) {
            await cache.delete(request)
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning cache:', cacheName, error)
    }
  }
}

// Network first with TTL (for API data)
async function networkFirstWithTTL(request, cacheName, ttl) {
  const cache = await caches.open(cacheName)
  
  try {
    // Try network first with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (networkResponse.ok) {
      // Cache successful responses with timestamp
      const responseToCache = addCacheHeaders(networkResponse.clone())
      cache.put(request, responseToCache)
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse && !isExpired(cachedResponse, ttl)) {
      // Add headers to indicate this is cached data
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: cachedResponse.headers
      })
      response.headers.set('X-Served-From', 'cache')
      response.headers.set('X-Cache-Age', (Date.now() - parseInt(cachedResponse.headers.get('sw-cached-time') || '0')).toString())
      return response
    }
    
    // No valid cache available, return error
    throw error
  }
}

// Cache first with TTL (for static assets and images)
async function cacheFirstWithTTL(request, cacheName, ttl) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  // Return cached response if valid
  if (cachedResponse && !isExpired(cachedResponse, ttl)) {
    // Update cache in background if it's getting old (stale-while-revalidate)
    const age = Date.now() - parseInt(cachedResponse.headers.get('sw-cached-time') || '0')
    if (age > ttl * 0.8) { // Refresh when 80% of TTL has passed
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          const responseToCache = addCacheHeaders(networkResponse.clone())
          cache.put(request, responseToCache)
        }
      }).catch(() => {}) // Ignore background update errors
    }
    
    return cachedResponse
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = addCacheHeaders(networkResponse.clone())
      cache.put(request, responseToCache)
    }
    
    return networkResponse
  } catch (error) {
    // Return stale cache if available
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: cachedResponse.headers
      })
      response.headers.set('X-Served-From', 'stale-cache')
      return response
    }
    
    // For navigation requests, return offline page
    if (request.destination === 'document') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - Staff Schedule</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: system-ui, sans-serif; 
                text-align: center; 
                padding: 2rem;
                background: #f8fafc;
                color: #374151;
              }
              .offline-message {
                max-width: 400px;
                margin: 0 auto;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .retry-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                margin-top: 1rem;
              }
              .retry-btn:hover {
                background: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="offline-message">
              <h1>You're Offline</h1>
              <p>The staff schedule is not available right now. Please check your internet connection and try again.</p>
              <button class="retry-btn" onclick="window.location.reload()">Retry</button>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
    
    throw error
  }
}

// Push event handler for LINE Chat notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'New Message',
    body: 'You have a new customer message',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `message-${Date.now()}`,
    requireInteraction: false,
    silent: false,
    renotify: false,
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      // Always use unique tags to prevent Chrome from silently replacing notifications
      const isTestNotification = data.title && data.title.includes('Test');
      const notificationTag = isTestNotification
        ? `test-notification-${Date.now()}`
        : `line-message-${data.conversationId || 'unknown'}-${Date.now()}`;

      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        tag: notificationTag,
        data: {
          conversationId: data.conversationId,
          lineUserId: data.lineUserId,
          customerName: data.customerName,
          url: data.url || '/staff/line-chat'
        }
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || '/staff/line-chat';

  // Focus existing tab or open new one
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    // Look for existing LINE chat tab
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes('/staff/line-chat')) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      // Focus existing tab and optionally navigate to specific conversation
      return matchingClient.focus().then(() => {
        if (event.notification.data?.conversationId) {
          // Send message to focus specific conversation
          return matchingClient.postMessage({
            action: 'focus-conversation',
            conversationId: event.notification.data.conversationId
          });
        }
      });
    } else {
      // Open new tab
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for failed requests (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync for failed API requests
      handleBackgroundSync()
    )
  }
})

async function handleBackgroundSync() {
  // Implementation for background sync of failed requests
  // This could include retrying failed schedule updates, etc.
  console.log('Background sync triggered')
}