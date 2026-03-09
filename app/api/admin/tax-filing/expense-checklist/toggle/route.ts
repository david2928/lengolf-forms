import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface ToggleRequest {
  type: 'annotation' | 'kbank_edc' | 'platform_fee' | 'bank_transaction';
  id?: number;           // for annotation
  item_key?: string;     // for kbank_edc / platform_fee / bank_transaction
  period?: string;       // for kbank_edc / platform_fee / bank_transaction
  flow_completed: boolean;
}

export async function PUT(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ToggleRequest = await request.json();
    const { type, flow_completed } = body;
    const now = flow_completed ? new Date().toISOString() : null;

    // Validate period format when present
    if (body.period !== undefined && !/^\d{4}-\d{2}$/.test(body.period)) {
      return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
    }

    if (type === 'annotation') {
      if (!body.id) {
        return NextResponse.json({ error: "id required for annotation type" }, { status: 400 });
      }

      const { error } = await refacSupabaseAdmin
        .schema('finance')
        .from('transaction_annotations')
        .update({
          flow_completed,
          flow_completed_at: now,
        })
        .eq('id', body.id);

      if (error) {
        console.error('Error updating annotation:', error);
        return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (type === 'kbank_edc') {
      if (!body.item_key || !body.period) {
        return NextResponse.json({ error: "item_key and period required for kbank_edc type" }, { status: 400 });
      }

      const { error } = await refacSupabaseAdmin
        .schema('finance')
        .from('expense_checklist_extras')
        .upsert(
          {
            period: body.period,
            item_key: body.item_key,
            flow_completed,
            flow_completed_at: now,
          },
          { onConflict: 'period,item_key' }
        );

      if (error) {
        console.error('Error upserting checklist extra:', error);
        return NextResponse.json({ error: "Failed to update checklist extra" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (type === 'platform_fee') {
      if (!body.item_key || !body.period) {
        return NextResponse.json({ error: "item_key and period required for platform_fee type" }, { status: 400 });
      }

      const { error } = await refacSupabaseAdmin
        .schema('finance')
        .from('expense_checklist_extras')
        .upsert(
          {
            period: body.period,
            item_key: body.item_key,
            flow_completed,
            flow_completed_at: now,
          },
          { onConflict: 'period,item_key' }
        );

      if (error) {
        console.error('Error upserting platform fee:', error);
        return NextResponse.json({ error: "Failed to update platform fee" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (type === 'bank_transaction') {
      if (!body.item_key || !body.period) {
        return NextResponse.json({ error: "item_key and period required for bank_transaction type" }, { status: 400 });
      }

      const { error } = await refacSupabaseAdmin
        .schema('finance')
        .from('expense_checklist_extras')
        .upsert(
          {
            period: body.period,
            item_key: body.item_key,
            flow_completed,
            flow_completed_at: now,
          },
          { onConflict: 'period,item_key' }
        );

      if (error) {
        console.error('Error upserting bank_transaction extra:', error);
        return NextResponse.json({ error: "Failed to update bank transaction" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "type must be 'annotation', 'kbank_edc', 'platform_fee', or 'bank_transaction'" }, { status: 400 });
  } catch (error) {
    console.error('Error in expense checklist toggle:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
