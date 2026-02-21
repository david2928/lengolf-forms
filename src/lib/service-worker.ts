'use client'

// Service Worker registration for push notifications
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('Service Worker registered successfully:', registration.scope)

        // New service workers will activate on next navigation
        // No immediate skipWaiting to avoid destabilizing active pages

      } catch (error) {
        console.log('Service Worker registration failed:', error)
      }
    })
  }
}
