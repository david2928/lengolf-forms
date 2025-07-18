import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { ScheduleErrorCodes, createScheduleError } from '@/types/errors'

export interface AuthResult {
  success: boolean
  user?: {
    email: string
    isAdmin: boolean
    isCoach: boolean
  }
  error?: any
}

export interface AuditLogEntry {
  user_email: string
  action: string
  resource_type: string
  resource_id?: string
  details: any
  ip_address?: string
  user_agent?: string
  timestamp: string
}

/**
 * Authenticate and authorize user for staff scheduling operations
 */
export async function authenticateStaffScheduleRequest(
  request: NextRequest,
  requireAdmin: boolean = false
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: createScheduleError(
          ScheduleErrorCodes.AUTHENTICATION_REQUIRED,
          { message: 'No active session found' },
          undefined,
          request.url
        )
      }
    }

    // Check if user is allowed to access the system
    const { data: allowedUser, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('email, is_admin, is_coach')
      .eq('email', session.user.email.toLowerCase())
      .single()

    if (userError || !allowedUser) {
      return {
        success: false,
        error: createScheduleError(
          ScheduleErrorCodes.UNAUTHORIZED_ACCESS,
          { email: session.user.email },
          undefined,
          request.url
        )
      }
    }

    // Check admin requirement
    if (requireAdmin && !allowedUser.is_admin) {
      return {
        success: false,
        error: createScheduleError(
          ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS,
          { 
            email: session.user.email,
            required: 'admin',
            actual: allowedUser.is_admin ? 'admin' : 'staff'
          },
          undefined,
          request.url
        )
      }
    }

    return {
      success: true,
      user: {
        email: session.user.email,
        isAdmin: allowedUser.is_admin || false,
        isCoach: allowedUser.is_coach || false
      }
    }

  } catch (error: any) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: createScheduleError(
        ScheduleErrorCodes.SERVER_ERROR,
        { originalError: error },
        undefined,
        request.url
      )
    }
  }
}

/**
 * Log audit trail for schedule modifications
 */
export async function logScheduleAudit(
  request: NextRequest,
  userEmail: string,
  action: string,
  resourceId?: string,
  details?: any
): Promise<void> {
  try {
    const auditEntry: AuditLogEntry = {
      user_email: userEmail,
      action,
      resource_type: 'staff_schedule',
      resource_id: resourceId,
      details: details || {},
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    }

    // Insert audit log entry
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('audit_logs')
      .insert(auditEntry)

    if (error) {
      console.error('Failed to log audit entry:', error)
      // Don't fail the request if audit logging fails
    }

  } catch (error) {
    console.error('Audit logging error:', error)
    // Don't fail the request if audit logging fails
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}

/**
 * Validate session timeout and refresh if needed
 */
export async function validateSessionTimeout(request: NextRequest): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return false
    }

    // Check if session is close to expiring (within 1 hour)
    const sessionExp = session.expires ? new Date(session.expires).getTime() : 0
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    if (sessionExp - now < oneHour) {
      console.log('Session expiring soon for user:', session.user?.email)
      // Session will be automatically refreshed by NextAuth
    }
    
    return true

  } catch (error) {
    console.error('Session validation error:', error)
    return false
  }
}

/**
 * Rate limiting for API endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key)
    }
  })
  
  const current = rateLimitMap.get(identifier)
  
  if (!current || current.resetTime < windowStart) {
    // New window
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime }
}