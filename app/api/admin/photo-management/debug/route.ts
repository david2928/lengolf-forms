import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { PHOTO_CONFIG } from '@/types/staff'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userIsAdmin = await isUserAdmin(session.user.email)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('=== STORAGE BUCKET DEBUG ===')
    console.log('Bucket name:', PHOTO_CONFIG.STORAGE_BUCKET)

    // Check if bucket exists
    const { data: buckets, error: bucketListError } = await refacSupabaseAdmin.storage.listBuckets()
    
    if (bucketListError) {
      console.error('Error listing buckets:', bucketListError)
      return NextResponse.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketListError
      })
    }

    console.log('Available buckets:', buckets?.map((b: any) => b.name))
    const bucketExists = buckets?.some((b: any) => b.name === PHOTO_CONFIG.STORAGE_BUCKET)
    
    if (!bucketExists) {
      return NextResponse.json({
        success: false,
        error: `Bucket '${PHOTO_CONFIG.STORAGE_BUCKET}' does not exist`,
        available_buckets: buckets?.map((b: any) => b.name) || []
      })
    }

    // List files in the bucket
    const { data: files, error: filesError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .list('', { 
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('Error listing files:', filesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to list files in bucket',
        bucket_exists: true,
        details: filesError
      })
    }

    console.log('Files in bucket:', files?.length || 0)
    
    // Try to find any recent files specifically
    const { data: recentFiles, error: recentFilesError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .list('', { 
        limit: 20,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    console.log('Recent files:', recentFiles?.length || 0)

    // Get actual photo files from inside the date folders
    let actualPhotoFiles = []
    if (recentFiles && recentFiles.length > 0) {
      console.log('Looking for actual photo files inside date folders...')
      
      for (const dateFolder of recentFiles.slice(0, 3)) { // Check up to 3 recent date folders
        if (dateFolder.name.match(/^\d{4}-\d{2}-\d{2}$/)) { // Only check date folders
          console.log(`Checking inside folder: ${dateFolder.name}`)
          
          const { data: folderFiles, error: folderError } = await refacSupabaseAdmin.storage
            .from(PHOTO_CONFIG.STORAGE_BUCKET)
            .list(dateFolder.name, { limit: 10 })
          
          if (!folderError && folderFiles && folderFiles.length > 0) {
            // Add the folder path to each file
            const fullPathFiles = folderFiles.map((file: any) => ({
              ...file,
              full_path: `${dateFolder.name}/${file.name}`,
              folder: dateFolder.name
            }))
            actualPhotoFiles.push(...fullPathFiles)
            console.log(`Found ${folderFiles.length} files in ${dateFolder.name}:`, folderFiles.map((f: any) => f.name))
          }
        }
      }
    }

    console.log(`Total actual photo files found: ${actualPhotoFiles.length}`)

    // Check what photo paths are stored in the database
    console.log('Checking database for stored photo paths...')
    const { data: dbPhotos, error: dbPhotoError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id, photo_url, timestamp, photo_captured')
      .not('photo_url', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(10)

    let dbPhotoPaths: Array<{
      id: number;
      photo_url: string;
      timestamp: string;
      photo_captured: boolean;
    }> = []
    if (!dbPhotoError && dbPhotos && dbPhotos.length > 0) {
      dbPhotoPaths = dbPhotos.map((entry: any) => ({
        id: entry.id,
        photo_url: entry.photo_url,
        timestamp: entry.timestamp,
        photo_captured: entry.photo_captured
      }))
      console.log('Database photo paths:', dbPhotoPaths.map((p: any) => p.photo_url))
    }

    // Test URL generation for an actual photo file if any exist
    let testUrlResult = null
    if (actualPhotoFiles.length > 0) {
      const testFile = actualPhotoFiles[0]
      console.log('Testing URL generation for actual photo file:', testFile.full_path)
      
      try {
        // Test signed URL on actual photo file
        const { data: signedTest, error: signedTestError } = await refacSupabaseAdmin.storage
          .from(PHOTO_CONFIG.STORAGE_BUCKET)
          .createSignedUrl(testFile.full_path, 3600)
        
        // Test public URL on actual photo file
        const { data: publicTest } = refacSupabaseAdmin.storage
          .from(PHOTO_CONFIG.STORAGE_BUCKET)
          .getPublicUrl(testFile.full_path)
        
        testUrlResult = {
          test_file: testFile.full_path,
          test_file_name: testFile.name,
          test_file_folder: testFile.folder,
          file_size: testFile.metadata?.size || 'Unknown',
          signed_url_success: !signedTestError,
          signed_url_error: signedTestError?.message,
          signed_url: signedTest?.signedUrl ? 'Generated successfully' : 'Failed',
          public_url: publicTest?.publicUrl || 'None',
          public_url_success: !!publicTest?.publicUrl,
          full_signed_url: signedTest?.signedUrl || null // Include actual URL for verification
        }
      } catch (urlTestError) {
        testUrlResult = {
          test_file: testFile.full_path,
          error: 'URL generation test failed',
          details: urlTestError instanceof Error ? urlTestError.message : 'Unknown error'
        }
      }
    } else if (recentFiles && recentFiles.length > 0) {
      // If no actual photo files found, note that we only found directories
      testUrlResult = {
        error: 'No actual photo files found',
        found_directories: recentFiles.map((f: any) => f.name),
        note: 'Only date folders found, no photo files inside them'
      }
    }

    return NextResponse.json({
      success: true,
      bucket_name: PHOTO_CONFIG.STORAGE_BUCKET,
      bucket_exists: true,
      total_directories: files?.length || 0,
      directories: files?.slice(0, 10).map((f: any) => ({
        name: f.name,
        id: f.id,
        size: f.metadata?.size,
        created_at: f.created_at,
        updated_at: f.updated_at
      })),
      actual_photo_files_count: actualPhotoFiles.length,
      actual_photo_files: actualPhotoFiles.slice(0, 5).map((f: any) => ({
        name: f.name,
        full_path: f.full_path,
        folder: f.folder,
        size: f.metadata?.size,
        created_at: f.created_at
      })),
      database_photos_count: dbPhotoPaths.length,
      database_photos: dbPhotoPaths.slice(0, 5),
      url_test: testUrlResult,
      storage_config: {
        bucket: PHOTO_CONFIG.STORAGE_BUCKET,
        retention_days: PHOTO_CONFIG.RETENTION_DAYS,
        max_file_size: PHOTO_CONFIG.MAX_FILE_SIZE
      }
    })

  } catch (error) {
    console.error('Error in storage debug:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 