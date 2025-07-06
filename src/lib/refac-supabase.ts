import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are defined (consider adding runtime checks if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;
// Only check service role key on server side
const supabaseServiceRoleKey = typeof window === 'undefined' ? process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY : null;

if (!supabaseUrl) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_URL');
  // Potentially throw an error or handle appropriately
}

if (!supabaseAnonKey) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY');
  // Potentially throw an error or handle appropriately
}

// Check for service role key only on server side
if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
  console.error('Error: Missing environment variable REFAC_SUPABASE_SERVICE_ROLE_KEY');
}

// Create a new Supabase client instance for the target project
// Note: Using NEXT_PUBLIC_ prefix for client-side accessibility, adjust if only server-side needed.
// If server-side only, use different env var names without NEXT_PUBLIC_ and load them accordingly.

// Fix RealtimeClient constructor issue by using a different approach
let refacSupabase: any;

try {
  // First try with minimal config that should avoid realtime initialization
  refacSupabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'lengolf-forms-minimal'
        }
      }
    }
  );
  console.log('✅ Supabase client created successfully with minimal config');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  // Create a mock client that can still be imported but will throw helpful errors
  refacSupabase = {
    rpc: () => Promise.reject(new Error('Supabase client failed to initialize')),
    from: () => ({ select: () => Promise.reject(new Error('Supabase client failed to initialize')) })
  };
}

export { refacSupabase };

// Create a service role client for server-side operations that need to bypass RLS
// For now, let's temporarily fall back to the anon key if service role is missing
// so we can see if the RLS policies are the issue or the key itself
export const refacSupabaseAdmin = supabaseServiceRoleKey ? 
  createClient(
    supabaseUrl || '',
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'lengolf-forms-admin'
        }
      }
    }
  ) : 
  // Temporary fallback to anon key with warning
  (() => {
    console.warn('🚨 TEMPORARY: refacSupabaseAdmin using anon key - service role missing!');
    return createClient(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'lengolf-forms-admin-fallback'
          }
        }
      }
    );
  })();

// Connection test function using backoffice schema
export async function checkRefacConnection() {
  try {
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_types')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Successfully connected to refac Supabase backoffice schema.');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to refac Supabase:', error);
    return false;
  }
}