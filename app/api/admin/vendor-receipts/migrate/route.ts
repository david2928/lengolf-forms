import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { extractFileIdFromUrl } from '@/lib/google-drive-service'

interface MigrationRecord {
  vendor_name: string
  drive_link: string
  receipt_date?: string
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const records: MigrationRecord[] = body.records

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Records array is required' }, { status: 400 })
    }

    const results = { imported: 0, skipped: 0, errors: [] as string[] }

    for (const record of records) {
      try {
        // Find or create vendor by name
        let vendorId: string

        const { data: existingVendor } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendors')
          .select('id')
          .eq('name', record.vendor_name)
          .single()

        if (existingVendor) {
          vendorId = existingVendor.id
        } else {
          const { data: newVendor, error: vendorError } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('vendors')
            .insert([{ name: record.vendor_name }])
            .select()
            .single()

          if (vendorError || !newVendor) {
            results.errors.push(`Failed to create vendor '${record.vendor_name}': ${vendorError?.message}`)
            results.skipped++
            continue
          }
          vendorId = newVendor.id
        }

        const fileId = extractFileIdFromUrl(record.drive_link)

        const { error: insertError } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendor_receipts')
          .insert([{
            vendor_id: vendorId,
            receipt_date: record.receipt_date || null,
            file_url: record.drive_link,
            file_id: fileId,
            file_name: null,
            submitted_by: 'Migration',
            notes: record.timestamp ? `Migrated from Google Form (original: ${record.timestamp})` : 'Migrated from Google Form',
          }])

        if (insertError) {
          results.errors.push(`Failed to insert receipt for '${record.vendor_name}': ${insertError.message}`)
          results.skipped++
        } else {
          results.imported++
        }
      } catch (err) {
        results.errors.push(`Error processing '${record.vendor_name}': ${err instanceof Error ? err.message : 'Unknown'}`)
        results.skipped++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error in POST /api/admin/vendor-receipts/migrate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
