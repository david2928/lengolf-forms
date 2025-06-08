import { refacSupabaseAdmin } from './refac-supabase';

export async function isUserAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log(`Access denied for email: ${email}`);
        return false;
      }
      console.error('Error checking user permissions:', error);
      return false;
    }
    
    console.log(`Access granted for email: ${email}`);
    return !!data;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
}

export async function isUserAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log(`User not found: ${email}`);
        return false;
      }
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data?.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}