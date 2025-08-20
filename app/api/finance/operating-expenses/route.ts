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

    const { searchParams } = new URL(request.url);
    const effectiveDate = searchParams.get('effectiveDate');

    let query = supabase
      .schema('finance')
      .from('operating_expenses')
      .select('*')
      .order('expense_category', { ascending: true })
      .order('expense_subcategory', { ascending: true });

    if (effectiveDate) {
      query = query
        .lte('effective_date', effectiveDate)
        .or(`end_date.is.null,end_date.gte.${effectiveDate}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to fetch operating expenses" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
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
    const { 
      expense_category, 
      expense_subcategory, 
      amount, 
      effective_date, 
      end_date, 
      is_fixed, 
      notes,
      display_category,
      display_order,
      show_in_pl
    } = body;

    if (!expense_category || !amount || !effective_date) {
      return NextResponse.json({ 
        error: "Expense category, amount, and effective date are required" 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema('finance')
      .from('operating_expenses')
      .insert({
        expense_category,
        expense_subcategory,
        amount: parseFloat(amount),
        effective_date,
        end_date,
        is_fixed: is_fixed !== undefined ? is_fixed : true,
        notes,
        display_category: display_category || 'Fixed Cost',
        display_order: display_order || 999,
        show_in_pl: show_in_pl !== undefined ? show_in_pl : true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to create operating expense" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
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
    const { 
      id,
      expense_category, 
      expense_subcategory, 
      amount, 
      effective_date, 
      end_date, 
      is_fixed, 
      notes,
      display_category,
      display_order,
      show_in_pl
    } = body;

    if (!id || !expense_category || !amount || !effective_date) {
      return NextResponse.json({ 
        error: "ID, expense category, amount, and effective date are required" 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema('finance')
      .from('operating_expenses')
      .update({
        expense_category,
        expense_subcategory,
        amount: parseFloat(amount),
        effective_date,
        end_date,
        is_fixed: is_fixed !== undefined ? is_fixed : true,
        notes,
        display_category: display_category || 'Fixed Cost',
        display_order: display_order || 999,
        show_in_pl: show_in_pl !== undefined ? show_in_pl : true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to update operating expense" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "Expense ID is required" 
      }, { status: 400 });
    }

    const { error } = await supabase
      .schema('finance')
      .from('operating_expenses')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to delete operating expense" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}