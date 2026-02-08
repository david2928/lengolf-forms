import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bank_transaction_id } = body;

    if (!bank_transaction_id) {
      return NextResponse.json({ error: "bank_transaction_id required" }, { status: 400 });
    }

    // Whitelist allowed annotation fields
    const ALLOWED_FIELDS = [
      'vendor_id', 'vendor_name_override', 'vat_type', 'vat_amount',
      'vat_reporting_month', 'wht_type', 'wht_rate', 'wht_amount',
      'wht_reporting_month', 'tax_base', 'vat_amount_override',
      'wht_amount_override', 'tax_base_override', 'invoice_ref', 'document_url', 'vendor_receipt_id', 'transaction_type', 'notes',
    ] as const;

    const upsertData: Record<string, unknown> = {
      bank_transaction_id,
      updated_by: session.user.email,
    };

    for (const key of ALLOWED_FIELDS) {
      if (key in body) upsertData[key] = body[key];
    }

    // Check if annotation already exists to set created_by
    const { data: existing } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .select('id')
      .eq('bank_transaction_id', bank_transaction_id)
      .maybeSingle();

    if (!existing) {
      upsertData.created_by = session.user.email;
    }

    const { data, error } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .upsert(upsertData, { onConflict: 'bank_transaction_id' })
      .select()
      .single();

    if (error) {
      console.error('Annotation upsert error:', error);
      return NextResponse.json({ error: "Failed to save annotation" }, { status: 500 });
    }

    return NextResponse.json({ annotation: data });
  } catch (error) {
    console.error('Annotation save error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
