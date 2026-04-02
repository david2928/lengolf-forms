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

    // Handle annotation items (multi-invoice support)
    const { items } = body;
    let savedItems = undefined;

    if (Array.isArray(items)) {
      const annotationId = data.id;

      if (items.length > 0) {
        // Replace all items: delete existing, insert new
        await refacSupabaseAdmin
          .schema('finance')
          .from('transaction_annotation_items')
          .delete()
          .eq('annotation_id', annotationId);

        const ITEM_FIELDS = [
          'item_index', 'invoice_ref', 'invoice_date', 'total_amount',
          'vat_type', 'vat_amount', 'wht_type', 'wht_rate', 'wht_amount',
          'tax_base', 'document_url', 'notes',
        ] as const;

        const itemRows = items.map((item: Record<string, unknown>) => {
          const row: Record<string, unknown> = { annotation_id: annotationId };
          for (const key of ITEM_FIELDS) {
            if (key in item) row[key] = item[key];
          }
          return row;
        });

        const { data: insertedItems, error: itemError } = await refacSupabaseAdmin
          .schema('finance')
          .from('transaction_annotation_items')
          .insert(itemRows)
          .select();

        if (itemError) {
          console.error('Item insert error:', itemError);
          return NextResponse.json({ error: "Failed to save annotation items" }, { status: 500 });
        }
        savedItems = insertedItems;

        // Auto-sum parent totals from items
        const r2 = (n: number) => Math.round(n * 100) / 100;
        let totalVat = 0, totalWht = 0, totalTaxBase = 0;
        for (const item of items) {
          totalVat += Number(item.vat_amount) || 0;
          totalWht += Number(item.wht_amount) || 0;
          totalTaxBase += Number(item.tax_base) || 0;
        }

        await refacSupabaseAdmin
          .schema('finance')
          .from('transaction_annotations')
          .update({
            has_items: true,
            vat_amount: r2(totalVat),
            wht_amount: r2(totalWht),
            tax_base: r2(totalTaxBase),
            vat_amount_override: true,
            wht_amount_override: true,
            tax_base_override: true,
          })
          .eq('id', annotationId);
      } else {
        // Empty items array: clear all items
        await refacSupabaseAdmin
          .schema('finance')
          .from('transaction_annotation_items')
          .delete()
          .eq('annotation_id', annotationId);

        await refacSupabaseAdmin
          .schema('finance')
          .from('transaction_annotations')
          .update({ has_items: false })
          .eq('id', annotationId);
      }
    }

    return NextResponse.json({ annotation: data, ...(savedItems ? { items: savedItems } : {}) });
  } catch (error) {
    console.error('Annotation save error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
