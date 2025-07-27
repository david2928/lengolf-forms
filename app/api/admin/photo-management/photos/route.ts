import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getTimeClockPhotoUrl } from '@/lib/photo-storage'
import { PHOTO_CONFIG } from '@/types/staff'
import { photoApiRateLimit } from '@/lib/rate-limiter'

interface PhotoRecord {
  id: string
  staff_id: number
  staff_name: string
  action: 'clock_in' | 'clock_out'
  timestamp: string
  photo_url: string
  file_path: string
  file_size: number
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    // PHASE 5 SECURITY: Apply rate limiting for resource-intensive photo operations
    const rateLimitResult = photoApiRateLimit(request);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Photo processing is resource intensive.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000))
          }
        }
      );
    }

    // Verify admin access with development bypass support
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Skip admin check in development with auth bypass
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      // Development bypass - skip admin check
    } else {
      const userIsAdmin = await isUserAdmin(session.user.email)
      if (!userIsAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Parse query parameters with PHASE 5 SECURITY: Resource limits
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date') || ''
    const endDate = url.searchParams.get('end_date') || ''
    const staffId = url.searchParams.get('staff_id')
    const action = url.searchParams.get('action')
    const requestedLimit = parseInt(url.searchParams.get('limit') || '50')
    const limit = Math.min(requestedLimit, 25) // PHASE 5: Max 25 photos per request to prevent resource exhaustion
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    // PHASE 5 SECURITY: Log resource-intensive requests
    if (requestedLimit > 25) {
      console.warn('Photo API request limit reduced for resource protection:', {
        requestedLimit,
        actualLimit: limit,
        identifier: rateLimitResult.identifier
      });
    }



    // Build query
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select(`
        id,
        staff_id,
        action,
        timestamp,
        created_at,
        photo_url,
        staff!inner(staff_name)
      `)
      .not('photo_url', 'is', null) // Only photos with actual photo URLs
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate + 'T23:59:59')
    }
    if (staffId && staffId !== 'all') {
      query = query.eq('staff_id', parseInt(staffId))
    }
    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    const { data: timeEntries, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { message: 'Database query failed', error: error.message },
        { status: 500 }
      )
    }

    // PHASE 4 FIX: Streamlined photo processing with better error handling
    const photosWithDetails: PhotoRecord[] = []
    let urlGenerationErrors = 0
    let urlGenerationSuccess = 0

    // PHASE 4 FIX: Process all photos with consistent structure
    const processPromises = (timeEntries || []).map(async (entry: any) => {
      if (!entry.photo_url) {
        return null
      }

      try {
        // Generate signed URL for this photo
        const signedUrl = await getTimeClockPhotoUrl(entry.photo_url)
        
        if (signedUrl) {
          urlGenerationSuccess++
        } else {
          urlGenerationErrors++
        }
        
        // PHASE 4 FIX: Consistent file size estimation based on photo config
        const estimatedFileSize = 20 * 1024 // 20KB average after JPEG optimization at 50% quality

        return {
          id: entry.id.toString(),
          staff_id: entry.staff_id,
          staff_name: (entry.staff as any)?.staff_name || 'Unknown Staff',
          action: entry.action,
          timestamp: entry.timestamp,
          photo_url: signedUrl, // Will be empty string if failed
          file_path: entry.photo_url,
          file_size: estimatedFileSize,
          created_at: entry.created_at
        }
      } catch (error) {
        urlGenerationErrors++
        console.error(`Phase 4: CRITICAL ERROR processing photo for entry ${entry.id}:`, error)
        
        // Still include the entry but with empty photo URL
        return {
          id: entry.id.toString(),
          staff_id: entry.staff_id,
          staff_name: (entry.staff as any)?.staff_name || 'Unknown Staff',
          action: entry.action,
          timestamp: entry.timestamp,
          photo_url: '', // Empty due to error
          file_path: entry.photo_url,
          file_size: 20 * 1024,
          created_at: entry.created_at
        }
      }
    })

    // PHASE 4 FIX: Process all photos concurrently with Promise.allSettled
    const results = await Promise.allSettled(processPromises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        photosWithDetails.push(result.value)
      } else if (result.status === 'rejected') {
        console.error(`Phase 4: Promise rejected for entry at index ${index}:`, result.reason)
        urlGenerationErrors++
      }
    })



    return NextResponse.json({
      photos: photosWithDetails,
      pagination: {
        total: photosWithDetails.length,
        limit,
        offset,
        has_more: photosWithDetails.length === limit
      },
      debug: {
        total_entries: timeEntries?.length || 0,
        successful_urls: urlGenerationSuccess,
        failed_urls: urlGenerationErrors,
        photos_with_valid_urls: photosWithDetails.filter((p: any) => p.photo_url).length,
        phase: "Phase 4 Optimized"
      }
    })

  } catch (error) {
    console.error('Error in photo management API:', error)
    
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    )
  }
} 