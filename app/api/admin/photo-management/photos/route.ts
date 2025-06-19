import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getTimeClockPhotoUrl } from '@/lib/photo-storage'
import { PHOTO_CONFIG } from '@/types/staff'

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
    console.log('=== PHOTOS API DEBUG START ===')
    
    // Verify admin access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('No session found')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userIsAdmin = await isUserAdmin(session.user.email)
    if (!userIsAdmin) {
      console.log('User is not admin:', session.user.email)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('Admin access verified for:', session.user.email)

    // Parse query parameters
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date') || ''
    const endDate = url.searchParams.get('end_date') || ''
    const staffId = url.searchParams.get('staff_id')
    const action = url.searchParams.get('action')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Query parameters:', {
      startDate,
      endDate,
      staffId,
      action,
      limit,
      offset
    })

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

    console.log('Executing database query...')
    const { data: timeEntries, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { message: 'Database query failed', error: error.message },
        { status: 500 }
      )
    }

    console.log(`Found ${timeEntries?.length || 0} time entries with photos`)

    // Process photos and generate signed URLs
    const photosWithDetails: PhotoRecord[] = []
    let urlGenerationErrors = 0

    for (const entry of timeEntries || []) {
      if (!entry.photo_url) {
        console.warn(`Entry ${entry.id} has null photo_url, skipping`)
        continue
      }

      try {
        console.log(`Processing entry ${entry.id} with photo: ${entry.photo_url}`)
        
        // Generate signed URL for this photo using simplified method
        const signedUrl = await getTimeClockPhotoUrl(entry.photo_url)
        
        if (!signedUrl) {
          console.warn(`Failed to generate URL for entry ${entry.id}, photo: ${entry.photo_url}`)
          urlGenerationErrors++
        }
        
        // For now, use estimated file size since getting exact size is complex
        // Most JPEG photos from camera are typically 15-30KB after optimization
        const estimatedFileSize = 25 * 1024 // 25KB estimate (after optimization)

        photosWithDetails.push({
          id: entry.id.toString(),
          staff_id: entry.staff_id,
          staff_name: (entry.staff as any)?.staff_name || 'Unknown',
          action: entry.action,
          timestamp: entry.timestamp,
          photo_url: signedUrl, // Will be empty string if failed
          file_path: entry.photo_url,
          file_size: estimatedFileSize,
          created_at: entry.created_at
        })
        
        console.log(`Successfully processed entry ${entry.id}, URL generated: ${!!signedUrl}`)
      } catch (error) {
        console.error(`Error processing photo for entry ${entry.id}:`, error)
        urlGenerationErrors++
        // Still include the entry but with empty photo URL
        photosWithDetails.push({
          id: entry.id.toString(),
          staff_id: entry.staff_id,
          staff_name: (entry.staff as any)?.staff_name || 'Unknown',
          action: entry.action,
          timestamp: entry.timestamp,
          photo_url: '', // Empty due to error
          file_path: entry.photo_url,
          file_size: 25 * 1024,
          created_at: entry.created_at
        })
      }
    }

    console.log(`Processed ${photosWithDetails.length} photos, ${photosWithDetails.filter(p => p.photo_url).length} with valid URLs`)
    console.log(`URL generation errors: ${urlGenerationErrors}`)
    console.log('=== PHOTOS API DEBUG END ===')

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
        successful_urls: photosWithDetails.filter(p => p.photo_url).length,
        failed_urls: urlGenerationErrors
      }
    })

  } catch (error) {
    console.error('=== PHOTOS API CRITICAL ERROR ===')
    console.error('Error in photo management API:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('=== END CRITICAL ERROR ===')
    
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