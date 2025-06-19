import { createClient } from '@supabase/supabase-js';

// IMPROVEMENT: Enhanced environment variable validation with early failure
function validateEnvironmentVariables() {
  const required = {
    'NEXT_PUBLIC_REFAC_SUPABASE_URL': process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
    'NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY,
    'REFAC_SUPABASE_SERVICE_ROLE_KEY': process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
  };
  
  const missing = Object.entries(required)
    .filter(([name, value]) => !value)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    throw new Error(
      `🚨 CRITICAL: Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure these are set in your environment configuration.'
    );
  }
  
  // Validate URL format
  const supabaseUrl = required['NEXT_PUBLIC_REFAC_SUPABASE_URL'];
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error(`🚨 CRITICAL: NEXT_PUBLIC_REFAC_SUPABASE_URL must be a valid HTTPS URL, got: ${supabaseUrl}`);
  }
  
  return required;
}

// Validate environment variables on module load
const env = validateEnvironmentVariables();
const supabaseUrl = env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseAnonKey = env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

// Create a new Supabase client instance for the target project  
// IMPROVEMENT: Client creation now guaranteed to have valid environment variables
export const refacSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// Create a service role client for server-side operations that need to bypass RLS
// SECURITY FIX: Removed dangerous fallback to anonymous key - fails fast instead
export const refacSupabaseAdmin = (() => {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      '🚨 CRITICAL: REFAC_SUPABASE_SERVICE_ROLE_KEY is required for admin operations. ' +
      'This prevents potential security vulnerabilities from using anonymous key for admin operations.'
    );
  }
  
  if (!supabaseUrl) {
    throw new Error('🚨 CRITICAL: NEXT_PUBLIC_REFAC_SUPABASE_URL is required');
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
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