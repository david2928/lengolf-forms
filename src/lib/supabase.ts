import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Required environment variables are missing:',
    {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    }
  )
  throw new Error('Missing required Supabase environment variables. Check .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Test the connection
void (async () => {
  try {
    const { error } = await supabase
      .from('package_types')
      .select('count', { count: 'exact' })
      .limit(1)
    
    if (error) {
      console.error('Failed to connect to Supabase:', error.message)
    }
  } catch (error) {
    console.error('Supabase connection error:', error)
  }
})()
