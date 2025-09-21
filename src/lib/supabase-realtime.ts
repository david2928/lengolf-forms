import { createClient } from '@supabase/supabase-js';

// Create a dedicated Supabase client for realtime functionality
// This avoids conflicts with the existing refac-supabase configuration

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables for realtime client');
}

// Create client specifically optimized for realtime subscriptions
export const supabaseRealtime = supabaseUrl && supabaseAnonKey ? createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
        heartbeatIntervalMs: 30000,
        reconnectDelayMs: 1000
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'lengolf-realtime'
      }
    }
  }
) : null;

// Ensure realtime client is properly initialized
if (supabaseRealtime && typeof window !== 'undefined') {
  // Initialize realtime connection on client side
  supabaseRealtime.realtime.connect();
}

export default supabaseRealtime;