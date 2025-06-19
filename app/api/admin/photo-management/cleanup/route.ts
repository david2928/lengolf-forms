import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { cleanupOldPhotos } from '@/lib/photo-storage'
import { PHOTO_CONFIG } from '@/types/staff'
import { subDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    console.log(`Starting photo cleanup process (retention: ${PHOTO_CONFIG.RETENTION_DAYS} days)`)
    
    // Calculate cutoff date
    const cutoffDate = subDays(new Date(), PHOTO_CONFIG.RETENTION_DAYS)
    const cutoffDateStr = cutoffDate.toISOString()
    
    // Get photos eligible for cleanup from database
    const { data: oldEntries, error: fetchError } = await refacSupabaseAdmin
      .from('time_entries')
      .select('id, photo_url, timestamp')
      .not('photo_url', 'is', null)
      .lt('timestamp', cutoffDateStr)
      .order('timestamp', { ascending: true })
    
    if (fetchError) {
      console.error('Error fetching old entries:', fetchError)
      return NextResponse.json(
        { message: 'Failed to fetch old photos for cleanup' },
        { status: 500 }
      )
    }
    
    if (!oldEntries || oldEntries.length === 0) {
      console.log('No photos eligible for cleanup')
      return NextResponse.json({
        deleted_count: 0,
        errors_count: 0,
        size_freed: 0,
        duration_ms: Date.now() - startTime,
        message: 'No photos to clean up'
      })
    }
    
    console.log(`Found ${oldEntries.length} photos eligible for cleanup`)
    
    // Track cleanup results
    let deletedCount = 0
    let errorsCount = 0
    let sizeFreed = 0
    
    // Get file sizes before deletion
    const fileSizes = new Map<string, number>()
    try {
      const { data: storageFiles, error: storageError } = await refacSupabaseAdmin.storage
        .from(PHOTO_CONFIG.STORAGE_BUCKET)
        .list('', { limit: 1000 })
      
      if (!storageError && storageFiles) {
        storageFiles.forEach(file => {
          fileSizes.set(file.name, file.metadata?.size || 0)
        })
      }
    } catch (err) {
      console.warn('Could not fetch file sizes for cleanup tracking:', err)
    }
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 50
    const batches = []
    for (let i = 0; i < oldEntries.length; i += batchSize) {
      batches.push(oldEntries.slice(i, i + batchSize))
    }
    
    console.log(`Processing ${batches.length} batches of ${batchSize} photos each`)
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} photos)`)
      
      // Collect file paths and IDs for this batch
      const filePaths: string[] = []
      const entryIds: number[] = []
      
      batch.forEach(entry => {
        if (entry.photo_url) {
          filePaths.push(entry.photo_url)
          entryIds.push(entry.id)
          
          // Track size freed
          const filename = entry.photo_url.split('/').pop() || ''
          const fileSize = fileSizes.get(filename) || 0
          sizeFreed += fileSize
        }
      })
      
      // Delete files from storage
      if (filePaths.length > 0) {
        try {
          const { error: storageError } = await refacSupabaseAdmin.storage
            .from(PHOTO_CONFIG.STORAGE_BUCKET)
            .remove(filePaths)
          
          if (storageError) {
            console.error(`Storage deletion error for batch ${batchIndex + 1}:`, storageError)
            errorsCount += filePaths.length
          } else {
            console.log(`Successfully deleted ${filePaths.length} files from storage`)
          }
        } catch (err) {
          console.error(`Exception during storage deletion for batch ${batchIndex + 1}:`, err)
          errorsCount += filePaths.length
        }
      }
      
      // Update database records
      try {
        const { error: updateError } = await refacSupabaseAdmin
          .from('time_entries')
          .update({ 
            photo_url: null,
            photo_captured: false
          })
          .in('id', entryIds)
        
        if (updateError) {
          console.error(`Database update error for batch ${batchIndex + 1}:`, updateError)
          errorsCount += entryIds.length
        } else {
          deletedCount += entryIds.length
          console.log(`Successfully updated ${entryIds.length} database records`)
        }
      } catch (err) {
        console.error(`Exception during database update for batch ${batchIndex + 1}:`, err)
        errorsCount += entryIds.length
      }
      
      // Small delay between batches to avoid overwhelming the system
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log(`Cleanup completed: ${deletedCount} deleted, ${errorsCount} errors, ${sizeFreed} bytes freed, ${duration}ms duration`)
    
    return NextResponse.json({
      deleted_count: deletedCount,
      errors_count: errorsCount,
      size_freed: sizeFreed,
      duration_ms: duration,
      message: `Cleanup completed: ${deletedCount} photos deleted${errorsCount > 0 ? `, ${errorsCount} errors` : ''}`
    })
    
  } catch (error) {
    console.error('Error in cleanup process:', error)
    return NextResponse.json(
      { message: 'Internal server error during cleanup' },
      { status: 500 }
    )
  }
} 