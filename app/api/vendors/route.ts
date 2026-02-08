import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

// In-memory cache for vendor list (with counts)
let vendorCache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function invalidateVendorCache() {
  vendorCache = null
}

async function getVendorsWithCounts() {
  if (vendorCache && Date.now() - vendorCache.timestamp < CACHE_TTL) {
    return vendorCache.data
  }

  // Fetch vendors and receipt counts in parallel
  const [vendorsRes, countsRes] = await Promise.all([
    refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    refacSupabaseAdmin.rpc('get_vendor_receipt_counts'),
  ])

  if (vendorsRes.error) throw vendorsRes.error

  // Build count lookup from RPC (falls back to empty if RPC doesn't exist)
  const countMap = new Map<string, number>()
  if (!countsRes.error && countsRes.data) {
    (countsRes.data as any[]).forEach((r: any) => countMap.set(r.vendor_id, Number(r.receipt_count)))
  }

  const result = (vendorsRes.data || []).map((v: any) => ({
    id: v.id,
    name: v.name,
    receipt_count: countMap.get(v.id) ?? 0,
  }))

  vendorCache = { data: result, timestamp: Date.now() }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const withCounts = request.nextUrl.searchParams.get('with_counts') === 'true'

    if (withCounts) {
      const result = await getVendorsWithCounts()
      return NextResponse.json(result)
    }

    // Simple list without counts (also served from cache if available)
    if (vendorCache && Date.now() - vendorCache.timestamp < CACHE_TTL) {
      const simple = vendorCache.data.map(({ id, name }: any) => ({ id, name }))
      return NextResponse.json(simple)
    }

    const { data: vendors, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching vendors:', error)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error in GET /api/vendors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 })
    }

    const { data: vendor, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .insert([{ name: name.trim(), category: category || null }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A vendor with this name already exists' }, { status: 409 })
      }
      console.error('Error creating vendor:', error)
      return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
    }

    // Invalidate cache so new vendor shows up immediately
    invalidateVendorCache()

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/vendors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
