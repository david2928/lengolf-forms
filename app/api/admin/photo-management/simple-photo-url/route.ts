import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { PHOTO_CONFIG } from '@/types/staff'

export async function POST(request: NextRequest) {
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

    const { photo_path } = await request.json()
    
    if (!photo_path) {
      return NextResponse.json({ error: 'photo_path is required' }, { status: 400 })
    }

    console.log('Generating photo URL for path:', photo_path)
    
    try {
      // Try to create signed URL
      const { data: signedData, error: signedError } = await refacSupabaseAdmin.storage
        .from(PHOTO_CONFIG.STORAGE_BUCKET)
        .createSignedUrl(photo_path, 3600); // 1 hour expiry
      
      if (!signedError && signedData?.signedUrl) {
        console.log('Successfully generated signed URL');
        return NextResponse.json({
          success: true,
          photo_url: signedData.signedUrl
        })
      }
      
      console.warn('Signed URL failed:', signedError?.message);
      
      // Try public URL as fallback
      const { data: publicData } = refacSupabaseAdmin.storage
        .from(PHOTO_CONFIG.STORAGE_BUCKET)
        .getPublicUrl(photo_path);
      
      if (publicData?.publicUrl) {
        console.log('Using public URL as fallback');
        return NextResponse.json({
          success: true,
          photo_url: publicData.publicUrl
        })
      }
      
      // If both fail, return an error
      return NextResponse.json({ 
        success: false,
        error: `Failed to generate URL: ${signedError?.message || 'Unknown error'}` 
      }, { status: 500 })
      
    } catch (urlError) {
      console.error('Error generating photo URL:', urlError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to generate photo URL' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in simple photo URL endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 