import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name, company_name, address, tax_id, is_company')
      .order('name', { ascending: true })
      .limit(20);

    if (q.length > 0) {
      query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Vendor search error:', error);
      return NextResponse.json({ error: "Failed to search vendors" }, { status: 500 });
    }

    return NextResponse.json({ vendors: data || [] });
  } catch (error) {
    console.error('Vendor search error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, tax_id, is_company, company_name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }

    console.log('[vendors POST] Received:', JSON.stringify({ name, address, tax_id, is_company, company_name }));

    // Check if vendor already exists - don't overwrite existing address/tax_id with extraction data
    const { data: existing } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name, company_name, address, tax_id, is_company')
      .eq('name', name.trim())
      .maybeSingle();

    if (existing) {
      console.log('[vendors POST] Vendor already exists:', JSON.stringify({ id: existing.id, name: existing.name, company_name: existing.company_name, address: existing.address, tax_id: existing.tax_id }));
      // Smart upsert: fill blank fields, only replace if significantly better
      const updates = computeVendorUpdates(existing, { name: name.trim(), company_name, address, tax_id });

      if (updates) {
        console.log('[vendors POST] Updating blank fields:', JSON.stringify(updates));
        const { data: updated, error: updateErr } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendors')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) {
          console.error('[vendors POST] Update error:', updateErr);
          return NextResponse.json({ vendor: existing });
        }
        return NextResponse.json({ vendor: updated });
      }
      return NextResponse.json({ vendor: existing });
    }

    // Create new vendor
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .insert({
        name: name.trim(),
        company_name: company_name || null,
        address: address || null,
        tax_id: tax_id || null,
        is_company: is_company ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('[vendors POST] Insert error:', error);
      return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
    }

    console.log('[vendors POST] Created new vendor:', JSON.stringify({ id: data.id, name: data.name, address: data.address, tax_id: data.tax_id }));

    return NextResponse.json({ vendor: data });
  } catch (error) {
    console.error('Vendor create error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
    }

    // Whitelist allowed fields
    const updates: Record<string, unknown> = {};
    if ('name' in body) updates.name = body.name;
    if ('company_name' in body) updates.company_name = body.company_name;
    if ('address' in body) updates.address = body.address;
    if ('tax_id' in body) updates.tax_id = body.tax_id;
    if ('is_company' in body) updates.is_company = body.is_company;

    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Vendor update error:', error);
      return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
    }

    return NextResponse.json({ vendor: data });
  } catch (error) {
    console.error('Vendor update error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
