import { createClient } from '@supabase/supabase-js';

// Create a minimal client specifically for realtime subscriptions
// Using minimal configuration to avoid initialization errors

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

// Add debugging for initialization
console.log('[Realtime Init] Initializing Supabase realtime client...');
console.log('[Realtime Init] URL available:', !!supabaseUrl);
console.log('[Realtime Init] Anon key available:', !!supabaseAnonKey);
if (supabaseUrl) {
  console.log('[Realtime Init] URL:', supabaseUrl);
}

// Only create if we have the required environment variables
export const supabaseRealtime = (supabaseUrl && supabaseAnonKey) ? (() => {
  console.log('[Realtime Init] ✅ Creating realtime client (realtime-only, no auth)');
  return createClient(
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
  );
})() : (() => {
  console.error('[Realtime Init] ❌ Failed to create realtime client - missing env vars');
  return null;
})();

export default supabaseRealtime;