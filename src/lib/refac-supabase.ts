import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are defined (consider adding runtime checks if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_URL');
  // Potentially throw an error or handle appropriately
}

if (!supabaseAnonKey) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY');
  // Potentially throw an error or handle appropriately
}

// Check for service role key
if (!supabaseServiceRoleKey) {
  console.error('Error: Missing environment variable REFAC_SUPABASE_SERVICE_ROLE_KEY');
}

// Create a new Supabase client instance for the target project
// Note: Using NEXT_PUBLIC_ prefix for client-side accessibility, adjust if only server-side needed.
// If server-side only, use different env var names without NEXT_PUBLIC_ and load them accordingly.
export const refacSupabase = createClient(
  supabaseUrl || '', // Provide default empty string to satisfy type, error logged above
  supabaseAnonKey || '' // Provide default empty string to satisfy type, error logged above
);

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