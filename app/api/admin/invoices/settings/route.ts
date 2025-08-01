import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic';


interface InvoiceSettings {
  default_wht_rate: string
  lengolf_name: string
  lengolf_address_line1: string
  lengolf_address_line2: string
  lengolf_tax_id: string
  bank_name: string
  bank_account_number: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to invoice settings')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching invoice settings for admin user:', session.user.email)
    
    const { data: settingsRows, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_settings')
      .select('key, value')

    if (error) {
      console.error('Database error fetching invoice settings:', {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform array of key-value pairs into object
    const settings: InvoiceSettings = {
      default_wht_rate: '3.00',
      lengolf_name: 'LENGOLF CO. LTD.',
      lengolf_address_line1: '540 Mercury Tower, 4th Floor, Unit 407 Ploenchit Road',
      lengolf_address_line2: 'Lumpini, Pathumwan, Bangkok 10330',
      lengolf_tax_id: '105566207013',
      bank_name: '',
      bank_account_number: ''
    }

    // Override with database values
    settingsRows?.forEach((row: any) => {
      if (row.key in settings) {
        (settings as any)[row.key] = row.value
      }
    })

    console.log('Successfully fetched invoice settings')
    return NextResponse.json(settings)

  } catch (error) {
    console.error('Invoice settings API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to update invoice settings')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Updating invoice settings for admin user:', session.user.email)

    // Validate required fields
    const requiredFields = ['default_wht_rate', 'lengolf_name', 'lengolf_tax_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `${field} is required` 
        }, { status: 400 })
      }
    }

    // Validate tax rate
    const taxRate = parseFloat(body.default_wht_rate)
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return NextResponse.json({ 
        error: 'Default WHT rate must be a number between 0 and 100' 
      }, { status: 400 })
    }

    // Prepare updates for upsert
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }))

    // Upsert settings
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_settings')
      .upsert(updates, { 
        onConflict: 'key',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Database error updating invoice settings:', {
        error: error.message,
        code: error.code,
        updates: updates.map(u => u.key),
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    console.log('Successfully updated invoice settings:', {
      settingsUpdated: updates.map(u => u.key),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully' 
    })

  } catch (error) {
    console.error('Invoice settings update API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}