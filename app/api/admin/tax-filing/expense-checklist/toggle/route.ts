import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface ToggleRequest {
  type: 'annotation' | 'kbank_edc' | 'platform_fee';
  id?: number;           // for annotation
  item_key?: string;     // for kbank_edc / platform_fee
  period?: string;       // for kbank_edc / platform_fee
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
        .update({
          flow_completed,
          flow_completed_at: now,
        })
        .eq('period', body.period)
        .eq('item_key', body.item_key);

      if (error) {
        console.error('Error updating platform fee:', error);
        return NextResponse.json({ error: "Failed to update platform fee" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "type must be 'annotation', 'kbank_edc', or 'platform_fee'" }, { status: 400 });
  } catch (error) {
    console.error('Error in expense checklist toggle:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
