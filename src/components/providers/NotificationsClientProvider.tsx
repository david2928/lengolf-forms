'use client';

/**
 * Client-side wrapper for NotificationsProvider
 *
 * This component allows the NotificationsProvider to be used in server components
 * by wrapping it in a client component boundary.
 */

import { ReactNode } from 'react';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

interface NotificationsClientProviderProps {
  children: ReactNode;
  staffId?: number;
}

export function NotificationsClientProvider({
  children,
  staffId
}: NotificationsClientProviderProps) {
  return (
    <NotificationsProvider staffId={staffId}>
      {children}
    </NotificationsProvider>
  );
}
