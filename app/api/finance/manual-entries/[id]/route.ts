import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, date, category, subcategory, description, amount } = body;
    const { id } = await params;

    if (!type || !date || !category || !amount) {
      return NextResponse.json({ 
        error: "Type, date, category, and amount are required" 
      }, { status: 400 });
    }

    if (!['revenue', 'expense'].includes(type)) {
      return NextResponse.json({ 
        error: "Type must be 'revenue' or 'expense'" 
      }, { status: 400 });
    }

    const updateData = {
      date,
      category,
      description,
      amount: parseFloat(amount),
      updated_at: new Date().toISOString()
    };

    let result;
    if (type === 'revenue') {
      const { data, error } = await supabase
        .schema('finance')
        .from('manual_revenue_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to update revenue entry" }, { status: 500 });
      }
      result = data;
    } else {
      const updateWithSubcategory = { ...updateData, subcategory };
      const { data, error } = await supabase
        .schema('finance')
        .from('manual_expense_entries')
        .update(updateWithSubcategory)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to update expense entry" }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const { id } = await params;

    if (!['revenue', 'expense'].includes(type || '')) {
      return NextResponse.json({ 
        error: "Type must be 'revenue' or 'expense'" 
      }, { status: 400 });
    }

    let result;
    if (type === 'revenue') {
      const { error } = await supabase
        .schema('finance')
        .from('manual_revenue_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to delete revenue entry" }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .schema('finance')
        .from('manual_expense_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to delete expense entry" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}