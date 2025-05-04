import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are defined (consider adding runtime checks if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_URL');
  // Potentially throw an error or handle appropriately
}

if (!supabaseAnonKey) {
  console.error('Error: Missing environment variable NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY');
  // Potentially throw an error or handle appropriately
}

// Create a new Supabase client instance for the target project
// Note: Using NEXT_PUBLIC_ prefix for client-side accessibility, adjust if only server-side needed.
// If server-side only, use different env var names without NEXT_PUBLIC_ and load them accordingly.
export const refacSupabase = createClient(
  supabaseUrl || '', // Provide default empty string to satisfy type, error logged above
  supabaseAnonKey || '' // Provide default empty string to satisfy type, error logged above
);

// Optional: Add a simple check function to verify connection if needed later
// export async function checkRefacConnection() {
//   try {
//     const { error } = await refacSupabase.from('bookings').select('id', { count: 'exact', head: true });
//     if (error) throw error;
//     console.log('Successfully connected to refac Supabase.');
//     return true;
//   } catch (error) {
//     console.error('Error connecting to refac Supabase:', error);
//     return false;
//   }
// } 