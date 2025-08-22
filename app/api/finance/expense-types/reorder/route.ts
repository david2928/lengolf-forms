import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expense1, expense2 } = body;

    if (!expense1 || !expense2 || !expense1.id || !expense2.id) {
      return NextResponse.json({ 
        error: "Both expense1 and expense2 with IDs are required" 
      }, { status: 400 });
    }

    // Update both expense types with their new sort orders
    const updates = [
      supabase
        .schema('finance')
        .from('expense_types')
        .update({ sort_order: expense1.sort_order })
        .eq('id', expense1.id),
      supabase
        .schema('finance')
        .from('expense_types')
        .update({ sort_order: expense2.sort_order })
        .eq('id', expense2.id)
    ];

    const results = await Promise.all(updates);

    // Check for errors in any of the updates
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Database errors:', errors);
      return NextResponse.json({ error: "Failed to update sort orders" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}