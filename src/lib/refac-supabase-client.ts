/**
 * Client-side Supabase client for Realtime subscriptions
 *
 * This module creates a client-side only Supabase instance to avoid
 * hydration errors with Realtime connections.
 */

'use client';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

/**
 * Get or create client-side Supabase client
 *
 * This ensures the client is only created in the browser, avoiding
 * server-side hydration issues.
 */
export function getRefacSupabaseClient(): SupabaseClient | null {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance
  if (clientInstance) {
    return clientInstance;
  }

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables');
    return null;
  }

  // Create client
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'lengolf-forms-client',
        },
      },
    });

    console.log('[Supabase Client] Client created successfully');
    return clientInstance;
  } catch (error) {
    console.error('[Supabase Client] Error creating client:', error);
    return null;
  }
}
