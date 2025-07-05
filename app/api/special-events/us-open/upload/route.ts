import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const scoreType = formData.get('scoreType') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!scoreType || !['stableford', 'stroke'].includes(scoreType)) {
      return NextResponse.json(
        { error: 'Invalid score type. Must be either "stableford" or "stroke"' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `us-open-${scoreType}-${timestamp}.${fileExtension}`

    // Upload to Supabase storage
    const { data, error } = await refacSupabaseAdmin.storage
      .from('scores')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading file to Supabase storage:', error)
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = refacSupabaseAdmin.storage
      .from('scores')
      .getPublicUrl(fileName)

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrlData.publicUrl,
      fileName: fileName
    })

  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 