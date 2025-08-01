import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { CreateDiscountRequest } from '@/types/discount';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: discounts, error } = await supabase
      .schema('pos')
      .from('discounts')
      .select(`
        *,
        discount_product_eligibility (
          id,
          product_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discounts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discounts: discounts || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreateDiscountRequest = await request.json();
    const { 
      title, 
      description, 
      discount_type, 
      discount_value, 
      application_scope, 
      availability_type, 
      valid_from, 
      valid_until, 
      eligible_product_ids 
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

    // Create discount
    const { data: discount, error: discountError } = await supabase
      .schema('pos')
      .from('discounts')
      .insert({
        title,
        description,
        discount_type,
        discount_value,
        application_scope,
        availability_type,
        valid_from: availability_type === 'date_range' ? valid_from : null,
        valid_until: availability_type === 'date_range' ? valid_until : null,
      })
      .select()
      .single();

    if (discountError) {
      console.error('Error creating discount:', discountError);
      return NextResponse.json({ error: discountError.message }, { status: 500 });
    }

    // Add product eligibility if item-level discount
    if (application_scope === 'item' && eligible_product_ids && eligible_product_ids.length > 0) {
      const eligibilityRecords = eligible_product_ids.map((productId: string) => ({
        discount_id: discount.id,
        product_id: productId
      }));

      const { error: eligibilityError } = await supabase
        .schema('pos')
        .from('discount_product_eligibility')
        .insert(eligibilityRecords);

      if (eligibilityError) {
        // Rollback discount creation
        await supabase.schema('pos').from('discounts').delete().eq('id', discount.id);
        console.error('Error creating product eligibility:', eligibilityError);
        return NextResponse.json({ error: eligibilityError.message }, { status: 500 });
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
      .eq('id', discount.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete discount:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ discount: completeDiscount }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}