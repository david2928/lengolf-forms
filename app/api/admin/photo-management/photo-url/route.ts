import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { getTimeClockPhotoUrl } from '@/lib/photo-storage'

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

    console.log('Generating signed URL for path:', photo_path)
    
    // Generate signed URL
    const signedUrl = await getTimeClockPhotoUrl(photo_path)
    
    if (!signedUrl) {
      console.error('getTimeClockPhotoUrl returned null/empty for path:', photo_path)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to generate photo URL - file may not exist or bucket access issue' 
      }, { status: 500 })
    }

    console.log('Successfully generated signed URL:', signedUrl)
    return NextResponse.json({
      success: true,
      photo_url: signedUrl
    })

  } catch (error) {
    console.error('Error generating photo URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 