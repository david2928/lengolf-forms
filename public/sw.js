const CACHE_NAME = 'staff-schedule-v1'
const STATIC_CACHE_NAME = 'staff-schedule-static-v1'

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/staff-schedule',
  '/manifest.json'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/staff-schedule\/staff/,
  /\/api\/staff-schedule\/schedules/,
  /\/api\/staff-schedule\/team/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Check if it's a staff schedule API
    const isStaffScheduleAPI = API_CACHE_PATTERNS.some(pattern => 
      pattern.test(url.pathname)
    )

    if (isStaffScheduleAPI) {
      event.respondWith(
        networkFirstWithCache(request)
      )
    } else {
      // For other APIs, try network first, no cache fallback
      event.respondWith(fetch(request))
    }
    return
  }

  // Handle static assets
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(
      cacheFirstWithNetworkFallback(request)
    )
    return
  }

  // Default: try network first
  event.respondWith(fetch(request))
})

// Network first, cache as fallback (for API data)
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      // Add a header to indicate this is cached data
      const response = cachedResponse.clone()
      response.headers.set('X-Served-From', 'cache')
      return response
    }
    
    // No cache available, return error
    throw error
  }
}

// Cache first, network as fallback (for static assets)
async function cacheFirstWithNetworkFallback(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // For navigation requests, return a basic offline page
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
              }
              .offline-message {
                max-width: 400px;
                margin: 0 auto;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <div class="offline-message">
              <h1>You're Offline</h1>
              <p>Please check your internet connection and try again.</p>
              <button onclick="window.location.reload()">Retry</button>
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