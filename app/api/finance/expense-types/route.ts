import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .schema('finance')
      .from('expense_types')
      .select(`
        id,
        name,
        sort_order,
        expense_subcategory:expense_subcategories!subcategory_id(
          id,
          name,
          expense_category:expense_categories!category_id(
            id,
            name
          )
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }); // Secondary sort by name

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to fetch expense types" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}