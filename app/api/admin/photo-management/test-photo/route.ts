import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { getTimeClockPhotoUrl } from '@/lib/photo-storage'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { PHOTO_CONFIG } from '@/types/staff'

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

    // Test the specific failing photo
    const testPhotoPath = '2025-06-17/timeclock_1750190337182_2_clock_out.jpg'
    
    console.log('=== TESTING SPECIFIC PHOTO ===')
    console.log('Photo path:', testPhotoPath)
    
    // Test 1: Check file existence directly
    const { data: fileList, error: listError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .list('2025-06-17', { limit: 100 })
    
    const fileExists = fileList?.some(f => f.name === 'timeclock_1750190337182_2_clock_out.jpg')
    
    // Test 2: Try signed URL directly
    const { data: signedData, error: signedError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .createSignedUrl(testPhotoPath, 3600)
    
    // Test 3: Try public URL directly
    const { data: publicData } = refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .getPublicUrl(testPhotoPath)
    
    // Test 4: Try our custom function
    const customUrl = await getTimeClockPhotoUrl(testPhotoPath)
    
    return NextResponse.json({
      success: true,
      test_photo_path: testPhotoPath,
      tests: {
        file_exists: fileExists,
        file_list: fileList?.map(f => f.name),
        list_error: listError,
        signed_url: {
          success: !signedError,
          url: signedData?.signedUrl,
          error: signedError
        },
        public_url: {
          url: publicData.publicUrl
        },
        custom_function: {
          url: customUrl
        }
      }
    })

  } catch (error) {
    console.error('Error in photo test:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 