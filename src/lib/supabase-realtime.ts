import { createClient } from '@supabase/supabase-js';

// Create a minimal client specifically for realtime subscriptions
// Using minimal configuration to avoid initialization errors

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

// Only create if we have the required environment variables
export const supabaseRealtime = (supabaseUrl && supabaseAnonKey) ? createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'lengolf-realtime-only'
      }
    }
  }
) : null;

export default supabaseRealtime;