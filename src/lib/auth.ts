import { refacSupabaseAdmin } from './refac-supabase';

// Simple in-memory cache for admin status (in production, use Redis)
interface AdminCache {
  [email: string]: {
    isAdmin: boolean;
    timestamp: number;
    ttl: number;
  };
}

const adminCache: AdminCache = {};
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const FALLBACK_ADMIN_EMAILS = process.env.FALLBACK_ADMIN_EMAILS?.split(',') || [];

/**
 * Clear admin cache for a specific email or all emails
 */
export function clearAdminCache(email?: string): void {
  if (email) {
    delete adminCache[email.toLowerCase()];
  } else {
    Object.keys(adminCache).forEach(key => delete adminCache[key]);
  }
}

/**
 * Enhanced user access check with better error handling
 */
export async function isUserAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase();
  
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('email')
      .eq('email', normalizedEmail)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log(`Access denied for email: ${email}`);
        return false;
      }
      console.error('Error checking user permissions:', error);
      
      // SECURITY FALLBACK: Check against fallback admin list
      if (FALLBACK_ADMIN_EMAILS.includes(normalizedEmail)) {
        console.warn(`Database error, but allowing fallback admin: ${email}`);
        return true;
      }
      
      return false;
    }
    
    console.log(`Access granted for email: ${email}`);
    return !!data;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    
    // SECURITY FALLBACK: Check against fallback admin list
    if (FALLBACK_ADMIN_EMAILS.includes(normalizedEmail)) {
      console.warn(`Exception occurred, but allowing fallback admin: ${email}`);
      return true;
    }
    
    return false;
  }
}

/**
 * Enhanced admin check with caching and fallback mechanisms
 * SECURITY ENHANCEMENT: Improved reliability and performance
 */
export async function isUserAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase();
  
  // Check cache first
  const cached = adminCache[normalizedEmail];
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    return cached.isAdmin;
  }
  
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin')
      .eq('email', normalizedEmail)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log(`User not found: ${email}`);
        
        // Cache negative result briefly
        adminCache[normalizedEmail] = {
          isAdmin: false,
          timestamp: Date.now(),
          ttl: ADMIN_CACHE_TTL / 5 // Shorter TTL for negative results
        };
        
        return false;
      }
      
      console.error('Error checking admin status:', error);
      
      // SECURITY FALLBACK: Check against fallback admin list
      if (FALLBACK_ADMIN_EMAILS.includes(normalizedEmail)) {
        console.warn(`Database error, but allowing fallback admin: ${email}`);
        
        // Cache fallback result with shorter TTL
        adminCache[normalizedEmail] = {
          isAdmin: true,
          timestamp: Date.now(),
          ttl: ADMIN_CACHE_TTL / 10 // Much shorter TTL for fallback
        };
        
        return true;
      }
      
      return false;
    }
    
    const isAdmin = data?.is_admin === true;
    
    // Cache the result
    adminCache[normalizedEmail] = {
      isAdmin,
      timestamp: Date.now(),
      ttl: ADMIN_CACHE_TTL
    };
    
    return isAdmin;
    
  } catch (error) {
    console.error('Error checking admin status:', error);
    
    // SECURITY FALLBACK: Check against fallback admin list
    if (FALLBACK_ADMIN_EMAILS.includes(normalizedEmail)) {
      console.warn(`Exception occurred, but allowing fallback admin: ${email}`);
      
      // Cache fallback result
      adminCache[normalizedEmail] = {
        isAdmin: true,
        timestamp: Date.now(),
        ttl: ADMIN_CACHE_TTL / 10 // Short TTL for fallback
      };
      
      return true;
    }
    
    return false;
  }
}

/**
 * Force refresh admin status from database
 * Useful when admin status changes and cache needs invalidation
 */
export async function refreshAdminStatus(email: string): Promise<boolean> {
  clearAdminCache(email);
  return await isUserAdmin(email);
}