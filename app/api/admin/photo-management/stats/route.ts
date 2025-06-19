import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

interface StorageStats {
  total_photos: number
  total_size_bytes: number
  oldest_photo_date: string
  newest_photo_date: string
  storage_bucket: string
  retention_days: number
  photos_eligible_for_cleanup: number
  estimated_cleanup_size: number
}

export async function GET(request: NextRequest) {
  try {
    // Get count of photos
    const { data: photoCountData, error: countError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id', { count: 'exact' })
      .not('photo_url', 'is', null)

    if (countError) {
      console.error('Error counting photos:', countError)
      return NextResponse.json(
        { message: 'Failed to fetch photo count' },
        { status: 500 }
      )
    }

    // Get oldest and newest photo dates
    const { data: dateRangeData, error: dateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('timestamp')
      .not('photo_url', 'is', null)
      .order('timestamp', { ascending: true })
      .limit(1)

    const { data: newestDateData, error: newestError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('timestamp')
      .not('photo_url', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1)

    if (dateError || newestError) {
      console.error('Error fetching date range:', dateError || newestError)
    }

    // Calculate retention cutoff date (30 days ago)
    const retentionDays = 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Count photos eligible for cleanup (older than retention period)
    const { data: eligibleData, error: eligibleError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id', { count: 'exact' })
      .not('photo_url', 'is', null)
      .lt('timestamp', cutoffDate.toISOString())

    if (eligibleError) {
      console.error('Error counting eligible photos:', eligibleError)
    }

    const totalPhotos = photoCountData?.length || 0
    const eligibleForCleanup = eligibleData?.length || 0

    // Estimate file sizes (since we don't store actual file sizes)
    // Most JPEG photos from camera are typically 100-500KB, using 250KB average
    const averagePhotoSize = 250 * 1024 // 250KB
    const totalSizeBytes = totalPhotos * averagePhotoSize
    const estimatedCleanupSize = eligibleForCleanup * averagePhotoSize

    const stats: StorageStats = {
      total_photos: totalPhotos,
      total_size_bytes: totalSizeBytes,
      oldest_photo_date: dateRangeData?.[0]?.timestamp || new Date().toISOString(),
      newest_photo_date: newestDateData?.[0]?.timestamp || new Date().toISOString(),
      storage_bucket: 'time-clock-photos', // Default bucket name
      retention_days: retentionDays,
      photos_eligible_for_cleanup: eligibleForCleanup,
      estimated_cleanup_size: estimatedCleanupSize
    }

    return NextResponse.json({
      stats
    })

  } catch (error) {
    console.error('Error in storage stats API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 