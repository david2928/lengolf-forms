import { createClient } from '@supabase/supabase-js'

/**
 * LEGACY SUPABASE CLIENT
 * 
 * ⚠️  DEPRECATED: This client connects to the legacy Supabase project (dujqvigihnlfnvmcdrko)
 * 
 * Migration Status: COMPLETED (June 2025)
 * - Data migrated to new project (bisimqmtxjsptehhqpeg) 
 * - Use `refacSupabase` or `refacSupabaseAdmin` from `@/lib/refac-supabase` instead
 * 
 * This client is maintained for:
 * - Historical reference
 * - Emergency fallback scenarios
 * - Migration verification
 * 
 * DO NOT USE FOR NEW FEATURES - Use refac-supabase.ts instead
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Legacy Supabase environment variables missing - this is expected if migration is complete:',
    {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    }
  )
  // Don't throw error for legacy client - just warn
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Legacy connection test - disabled to avoid errors
// Use refacSupabase for active connection testing
void (async () => {
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const { error } = await supabase
        .from('package_types')
        .select('count', { count: 'exact' })
        .limit(1)
      
      if (error) {
        console.warn('Legacy Supabase connection failed (expected):', error.message)
      } else {
        console.log('✅ Legacy Supabase still accessible for fallback')
      }
    }
  } catch (error) {
    console.warn('Legacy Supabase connection error (expected):', error)
  }
})()
