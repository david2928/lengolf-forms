/**
 * Google Tag Manager dataLayer utilities
 *
 * Provides type-safe helpers for pushing events to the GTM dataLayer.
 * The GTM container (loaded in app/layout.tsx) picks these up and
 * forwards them to Google Ads conversion tags, GA4, etc.
 */

// Extend the Window interface for dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Push a custom event (with optional data) to the GTM dataLayer.
 * Safe to call during SSR — silently no-ops when `window` is unavailable.
 */
export function pushDataLayerEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}
