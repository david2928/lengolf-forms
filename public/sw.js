// Service Worker - Push notifications only
// No caching strategies - let the browser and Next.js handle caching natively

// Install event - let the new SW activate naturally on next navigation
// Avoid skipWaiting() to prevent destabilizing active pages mid-session
self.addEventListener('install', (event) => {
  // No-op: activation deferred to next page load
})

// Activate event - clean up any old caches from previous SW versions, then claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
      .then(() => self.clients.claim())
  )
})

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
          url: data.url || '/staff/unified-chat'
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
  const urlToOpen = event.notification.data?.url || '/staff/unified-chat';

  // Focus existing tab or open new one
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    // Look for existing unified chat tab
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes('/staff/unified-chat')) {
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
  // SKIP_WAITING removed to prevent mid-session activation
  // New service workers will activate on next navigation
});
