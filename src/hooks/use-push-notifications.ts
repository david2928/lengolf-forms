import { useState, useEffect, useCallback } from 'react';

interface PushNotificationSubscription {
  id: string;
  endpoint: string;
  created_at: string;
  user_agent: string;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptions: PushNotificationSubscription[];
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<PushNotificationSubscription[]>([]);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);
    };

    checkSupport();
  }, []);

  // Register service worker
  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported, registerServiceWorker]);

  // Check subscription status on mount
  useEffect(() => {
    if (isSupported) {
      checkSubscriptionStatus();
    }
  }, [isSupported, checkSubscriptionStatus]);

  const registerServiceWorker = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
      setError('Failed to register service worker');
    }
  }, []);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.action === 'focus-conversation') {
      // Handle focusing on specific conversation
      const conversationId = event.data.conversationId;

      // Dispatch custom event that the LINE Chat component can listen to
      window.dispatchEvent(new CustomEvent('focus-conversation', {
        detail: { conversationId }
      }));
    }
  };

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check browser subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        setSubscriptions([]);
        return;
      }

      // Check server-side subscriptions
      const response = await fetch('/api/push-notifications/subscribe');
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.subscriptions);
        setIsSubscribed(data.subscriptions.length > 0);
      } else {
        setIsSubscribed(false);
        setSubscriptions([]);
      }

    } catch (error) {
      console.error('Error checking subscription status:', error);
      setError('Failed to check subscription status');
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Send subscription to server
      const response = await fetch('/api/push-notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      await checkSubscriptionStatus(); // Refresh subscription list

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, checkSubscriptionStatus]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push-notifications/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      setSubscriptions([]);

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setError('Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendTestNotification = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/push-notifications/send');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send test notification');
      }

    } catch (error) {
      console.error('Error sending test notification:', error);
      setError('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscriptions,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkSubscriptionStatus
  };
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}