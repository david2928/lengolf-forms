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

        // Handle updates - activate new SW immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW available, tell it to activate immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              }
            })
          }
        })

      } catch (error) {
        console.log('Service Worker registration failed:', error)
      }
    })
  }
}
