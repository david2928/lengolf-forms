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
      .select(`
        *,
        expense_type:expense_types!expense_type_id(
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
        )
      `);

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
      expense_type_id, 
      expense_type_name,
      subcategory_id,
      sort_order,
      amount, 
      effective_date, 
      end_date, 
      notes,
      cost_type
    } = body;

    if (!amount || !effective_date) {
      return NextResponse.json({ 
        error: "Amount and effective date are required" 
      }, { status: 400 });
    }

    let finalExpenseTypeId = expense_type_id;

    // If creating a new expense type (no expense_type_id provided)
    if (!expense_type_id && expense_type_name && subcategory_id) {
      // Create new expense type
      const { data: newExpenseType, error: expenseTypeError } = await supabase
        .schema('finance')
        .from('expense_types')
        .insert({
          name: expense_type_name,
          subcategory_id: parseInt(subcategory_id),
          sort_order: sort_order || 0,
          is_active: true
        })
        .select('id')
        .single();

      if (expenseTypeError) {
        console.error('Error creating expense type:', expenseTypeError);
        return NextResponse.json({ error: "Failed to create expense type" }, { status: 500 });
      }

      finalExpenseTypeId = newExpenseType.id;
    } else if (!expense_type_id) {
      return NextResponse.json({ 
        error: "Either expense_type_id or (expense_type_name and subcategory_id) must be provided" 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema('finance')
      .from('operating_expenses')
      .insert({
        expense_type_id: parseInt(finalExpenseTypeId),
        amount: parseFloat(amount),
        effective_date,
        end_date,
        notes,
        cost_type
      })
      .select(`
        *,
        expense_type:expense_types!expense_type_id(
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
        )
      `)
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
      expense_type_id, 
      amount, 
      effective_date, 
      end_date, 
      notes,
      cost_type
    } = body;

    if (!id || !expense_type_id || !amount || !effective_date) {
      return NextResponse.json({ 
        error: "ID, expense type ID, amount, and effective date are required" 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema('finance')
      .from('operating_expenses')
      .update({
        expense_type_id: parseInt(expense_type_id),
        amount: parseFloat(amount),
        effective_date,
        end_date,
        notes,
        cost_type
      })
      .eq('id', id)
      .select(`
        *,
        expense_type:expense_types!expense_type_id(
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
        )
      `)
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