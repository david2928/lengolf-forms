import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const r2 = (n: number) => Math.round(n * 100) / 100;

const ITEM_FIELDS = [
  'item_index', 'invoice_ref', 'invoice_date', 'total_amount',
  'vat_type', 'vat_amount', 'wht_type', 'wht_rate', 'wht_amount',
  'tax_base', 'document_url', 'notes',
] as const;

/** Recalculate parent annotation totals from its items. Returns updated parent. */
async function recalcParentTotals(annotationId: number) {
  const { data: items } = await refacSupabaseAdmin
    .schema('finance')
    .from('transaction_annotation_items')
    .select('vat_amount, wht_amount, tax_base')
    .eq('annotation_id', annotationId);

  if (!items || items.length === 0) {
    // No items left — clear has_items flag
    const { data: updated } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .update({ has_items: false })
      .eq('id', annotationId)
      .select()
      .single();
    return updated;
  }

  let totalVat = 0, totalWht = 0, totalTaxBase = 0;
  for (const item of items) {
    totalVat += Number(item.vat_amount) || 0;
    totalWht += Number(item.wht_amount) || 0;
    totalTaxBase += Number(item.tax_base) || 0;
  }

  const { data: updated } = await refacSupabaseAdmin
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
    .eq('id', annotationId)
    .select()
    .single();

  return updated;
}

/** POST — add a new item to an annotation */
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { annotation_id } = body;

    if (!annotation_id) {
      return NextResponse.json({ error: "annotation_id required" }, { status: 400 });
    }

    // Get next item_index
    const { data: existing } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotation_items')
      .select('item_index')
      .eq('annotation_id', annotation_id)
      .order('item_index', { ascending: false })
      .limit(1);

    const nextIndex = existing && existing.length > 0 ? existing[0].item_index + 1 : 0;

    const row: Record<string, unknown> = {
      annotation_id,
      item_index: nextIndex,
    };
    for (const key of ITEM_FIELDS) {
      if (key in body && key !== 'item_index') row[key] = body[key];
    }

    const { data, error } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotation_items')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Item insert error:', error);
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }

    const parentAnnotation = await recalcParentTotals(annotation_id);

    return NextResponse.json({ item: data, annotation: parentAnnotation });
  } catch (error) {
    console.error('Annotation item POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PUT — update a single item by id */
export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    for (const key of ITEM_FIELDS) {
      if (key in body) updateData[key] = body[key];
    }

    const { data, error } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotation_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Item update error:', error);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    const parentAnnotation = await recalcParentTotals(data.annotation_id);

    return NextResponse.json({ item: data, annotation: parentAnnotation });
  } catch (error) {
    console.error('Annotation item PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE — remove item by id */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Get annotation_id before deleting
    const { data: item } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotation_items')
      .select('annotation_id')
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { error } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotation_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Item delete error:', error);
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

    const parentAnnotation = await recalcParentTotals(item.annotation_id);

    return NextResponse.json({ success: true, annotation: parentAnnotation });
  } catch (error) {
    console.error('Annotation item DELETE error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
