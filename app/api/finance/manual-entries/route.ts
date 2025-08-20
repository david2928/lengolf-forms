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
    const type = searchParams.get('type'); // 'revenue' or 'expense'
    const month = searchParams.get('month');
    const category = searchParams.get('category'); // specific category

    if (!type || !['revenue', 'expense'].includes(type)) {
      return NextResponse.json({ error: "Type must be 'revenue' or 'expense'" }, { status: 400 });
    }

    const tableName = type === 'revenue' ? 'manual_revenue_entries' : 'manual_expense_entries';

    // If category is specified, get specific entry
    if (category && month) {
      const monthStart = `${month}-01`;
      const { data, error } = await supabase
        .schema('finance')
        .from(tableName)
        .select('*')
        .eq('category', category)
        .eq('month', monthStart)
        .maybeSingle();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to fetch manual entry" }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Otherwise, get all entries
    let query = supabase.schema('finance').from(tableName).select('*').order('date', { ascending: false });

    if (month) {
      const monthStart = `${month}-01`;
      const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        .toISOString().split('T')[0];
      query = query.gte('date', monthStart).lte('date', monthEnd);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to fetch manual entries" }, { status: 500 });
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
    const { type, date, category, subcategory, description, amount } = body;

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

    const month = new Date(date).toISOString().split('T')[0].substring(0, 7) + '-01';
    
    // Check if entry exists
    const tableName = type === 'revenue' ? 'manual_revenue_entries' : 'manual_expense_entries';
    const { data: existingEntry } = await supabase
      .schema('finance')
      .from(tableName)
      .select('id')
      .eq('category', category)
      .eq('month', month)
      .maybeSingle();

    const entryData = {
      date,
      month,
      category,
      description: description || null, // Allow empty descriptions
      amount: parseFloat(amount),
      updated_at: new Date().toISOString(),
      ...(existingEntry ? { id: existingEntry.id } : { created_by: session.user.email, created_at: new Date().toISOString() })
    };

    let result;
    if (type === 'revenue') {
      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .schema('finance')
          .from('manual_revenue_entries')
          .update(entryData)
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return NextResponse.json({ error: "Failed to update revenue entry" }, { status: 500 });
        }
        result = data;
      } else {
        // Insert new entry
        const { data, error } = await supabase
          .schema('finance')
          .from('manual_revenue_entries')
          .insert(entryData)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return NextResponse.json({ error: "Failed to create revenue entry" }, { status: 500 });
        }
        result = data;
      }
    } else {
      const entryWithSubcategory = { ...entryData, subcategory };
      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .schema('finance')
          .from('manual_expense_entries')
          .update(entryWithSubcategory)
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return NextResponse.json({ error: "Failed to update expense entry" }, { status: 500 });
        }
        result = data;
      } else {
        // Insert new entry
        const { data, error } = await supabase
          .schema('finance')
          .from('manual_expense_entries')
          .insert(entryWithSubcategory)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return NextResponse.json({ error: "Failed to create expense entry" }, { status: 500 });
        }
        result = data;
      }
    }

    return NextResponse.json(result);
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
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const category = searchParams.get('category');

    if (!type || !['revenue', 'expense'].includes(type) || !month || !category) {
      return NextResponse.json({ 
        error: "Type, month, and category are required" 
      }, { status: 400 });
    }

    const tableName = type === 'revenue' ? 'manual_revenue_entries' : 'manual_expense_entries';
    const monthStart = `${month}-01`;

    const { error } = await supabase
      .schema('finance')
      .from(tableName)
      .delete()
      .eq('category', category)
      .eq('month', monthStart);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to delete manual entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}