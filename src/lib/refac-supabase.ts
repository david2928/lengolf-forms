import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are defined (consider adding runtime checks if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;
// Only check service role key on server side
const supabaseServiceRoleKey = typeof window === 'undefined' ? process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY : null;

if (!supabaseUrl) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY');
  console.error('Please add NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY to your .env.local file');
}

// Check for service role key only on server side
if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
  console.error('Error: Missing environment variable REFAC_SUPABASE_SERVICE_ROLE_KEY');
}

// Only create Supabase client if we have the required keys
let refacSupabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  // Create Supabase client with minimal configuration to avoid realtime issues
  refacSupabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'lengolf-forms'
        }
      }
    }
  );
} else {
  console.error('Cannot create Supabase client: missing URL or anon key');
}

export { refacSupabase };

// Create a service role client for server-side operations that need to bypass RLS
let refacSupabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  refacSupabaseAdmin = createClient(
    supabaseUrl,
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
  );
} else if (refacSupabase) {
  // Fallback to anon key with warning
  console.warn('🚨 Using anon key for admin client - service role missing!');
  refacSupabaseAdmin = refacSupabase;
} else {
  console.error('Cannot create Supabase admin client: missing URL or service role key');
}

export { refacSupabaseAdmin };

// Helper function to get the appropriate client (used in API routes)
export function getRefacSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: use admin client with service role
    return refacSupabaseAdmin;
  } else {
    // Client-side: use regular client
    return refacSupabase;
  }
}

// Helper function to get the appropriate client (used in API routes)
export function getRefacSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: use admin client with service role
    return refacSupabaseAdmin;
  } else {
    // Client-side: use regular client
    return refacSupabase;
  }
}

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