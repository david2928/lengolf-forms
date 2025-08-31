import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { UpdateDiscountRequest } from '@/types/discount';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: discount, error } = await supabase
      .schema('pos')
      .from('discounts')
      .select(`
        *,
        discount_product_eligibility (
          id,
          product_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching discount:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Discount not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discount });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: UpdateDiscountRequest = await request.json();
    const { 
      title, 
      description, 
      discount_type, 
      discount_value, 
      application_scope,
      availability_type, 
      valid_from, 
      valid_until, 
      eligible_product_ids,
      is_active
    } = body;

    // Validate required fields
    if (!title || !discount_type || !discount_value || !application_scope || !availability_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate discount value
    if (discount_value <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }

    // Validate date range
    if (availability_type === 'date_range') {
      if (!valid_from || !valid_until) {
        return NextResponse.json({ error: "Start and end dates are required for date range discounts" }, { status: 400 });
      }
      if (new Date(valid_from) >= new Date(valid_until)) {
        return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
      }
    }

    // Validate product eligibility for item-level discounts
    if (application_scope === 'item' && (!eligible_product_ids || eligible_product_ids.length === 0)) {
      return NextResponse.json({ error: "At least one product must be selected for item-level discounts" }, { status: 400 });
    }

    // Update discount
    const updateData: any = {
      title,
      description,
      discount_type,
      discount_value,
      application_scope,
      availability_type,
      valid_from: availability_type === 'date_range' ? valid_from : null,
      valid_until: availability_type === 'date_range' ? valid_until : null,
      updated_at: new Date().toISOString()
    };

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const { data: discount, error: discountError } = await supabase
      .schema('pos')
      .from('discounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (discountError) {
      console.error('Error updating discount:', discountError);
      if (discountError.code === 'PGRST116') {
        return NextResponse.json({ error: "Discount not found" }, { status: 404 });
      }
      return NextResponse.json({ error: discountError.message }, { status: 500 });
    }

    // Update product eligibility
    if (application_scope === 'item') {
      // Remove existing eligibility
      const { error: deleteError } = await supabase
        .schema('pos')
        .from('discount_product_eligibility')
        .delete()
        .eq('discount_id', id);

      if (deleteError) {
        console.error('Error removing existing eligibility:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // Add new eligibility
      if (eligible_product_ids && eligible_product_ids.length > 0) {
        const eligibilityRecords = eligible_product_ids.map((productId: string) => ({
          discount_id: id,
          product_id: productId
        }));

        const { error: eligibilityError } = await supabase
          .schema('pos')
          .from('discount_product_eligibility')
          .insert(eligibilityRecords);

        if (eligibilityError) {
          console.error('Error creating product eligibility:', eligibilityError);
          return NextResponse.json({ error: eligibilityError.message }, { status: 500 });
        }
      }
    }

    // Fetch the complete discount with eligibility
    const { data: completeDiscount, error: fetchError } = await supabase
      .schema('pos')
      .from('discounts')
      .select(`
        *,
        discount_product_eligibility (
          id,
          product_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete discount:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ discount: completeDiscount });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if discount is being used
    const { data: usedInOrders } = await supabase
      .schema('pos')
      .from('orders')
      .select('id')
      .eq('applied_discount_id', id)
      .limit(1);

    const { data: usedInOrderItems } = await supabase
      .schema('pos')
      .from('order_items')
      .select('id')
      .eq('applied_discount_id', id)
      .limit(1);

    const { data: usedInTransactions } = await supabase
      .schema('pos')
      .from('transactions')
      .select('id')
      .eq('applied_discount_id', id)
      .limit(1);

    const { data: usedInTransactionItems } = await supabase
      .schema('pos')
      .from('transaction_items')
      .select('id')
      .eq('applied_discount_id', id)
      .limit(1);

    if (usedInOrders?.length || usedInOrderItems?.length || usedInTransactions?.length || usedInTransactionItems?.length) {
      return NextResponse.json({ 
        error: "Cannot delete discount that has been used in orders or transactions" 
      }, { status: 400 });
    }

    const { error } = await supabase
      .schema('pos')
      .from('discounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting discount:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Discount not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}