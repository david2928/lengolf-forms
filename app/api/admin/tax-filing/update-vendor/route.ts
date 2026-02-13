import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const ALLOWED_FIELDS = ['tax_id', 'address', 'tax_first_name', 'tax_last_name', 'prefix', 'is_company'] as const;

export async function PUT(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { vendor_id } = body;

    if (!vendor_id) {
      return NextResponse.json({ error: "Missing vendor_id" }, { status: 400 });
    }

    // Whitelist allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .update(updateData)
      .eq('id', vendor_id)
      .select('id, name, tax_id, address, is_company, tax_first_name, tax_last_name, prefix')
      .single();

    if (error) {
      console.error('Error updating vendor:', error);
      return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in update-vendor endpoint:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
