import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { deleteTimeClockPhoto } from '@/lib/photo-storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;

    if (!photoId) {
      return NextResponse.json(
        { message: 'Photo ID is required' },
        { status: 400 }
      )
    }

    // Get the photo record to find the file path
    const { data: timeEntry, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('photo_url')
      .eq('id', parseInt(photoId))
      .single()

    if (fetchError || !timeEntry) {
      console.error('Error fetching time entry:', fetchError)
      return NextResponse.json(
        { message: 'Photo not found' },
        { status: 404 }
      )
    }

    // Delete from storage if photo_url exists
    if (timeEntry.photo_url) {
      const deleteSuccess = await deleteTimeClockPhoto(timeEntry.photo_url)
      if (!deleteSuccess) {
        console.warn('Failed to delete photo from storage, continuing with database update')
      }
    }

    // Update the database record to remove photo reference
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .update({ 
        photo_url: null,
        photo_captured: false
      })
      .eq('id', parseInt(photoId))

    if (updateError) {
      console.error('Error updating time entry:', updateError)
      return NextResponse.json(
        { message: 'Failed to update photo record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Photo deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 