import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      employee_name,
      customer_name,
      customer_id,
      package_type_id,
      purchase_date,
      first_use_date,
      purchase_price,
      discount_percentage,
      discount_amount,
      applied_discount_id,
      discount_note,
      transaction_id
    } = body;

    // Validate required fields - prioritize customer_id over customer_name
    if (!employee_name || (!customer_id && !customer_name) || !package_type_id || !purchase_date) {
      return NextResponse.json({ 
        error: "Missing required fields: employee_name, customer_id (or customer_name), package_type_id, purchase_date" 
      }, { status: 400 });
    }

    // If customer_id is provided, fetch customer details
    let finalCustomerName = customer_name;
    let finalCustomerId = customer_id;

    if (customer_id) {
      const { data: customer, error: customerError } = await refacSupabaseAdmin
        .from('customers')
        .select('customer_name')
        .eq('id', customer_id)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        return NextResponse.json({ 
          error: "Invalid customer ID provided" 
        }, { status: 400 });
      }

      finalCustomerName = customer.customer_name;
    }

    // Prepare package data with optional discount fields
    const packageData: any = {
      employee_name,
      customer_name: finalCustomerName,
      customer_id: finalCustomerId,
      package_type_id,
      purchase_date,
      first_use_date: first_use_date || null
    };

    // Add discount fields if provided
    if (purchase_price !== undefined) packageData.purchase_price = purchase_price;
    if (discount_percentage !== undefined) packageData.discount_percentage = discount_percentage;
    if (discount_amount !== undefined) packageData.discount_amount = discount_amount;
    if (applied_discount_id) packageData.applied_discount_id = applied_discount_id;
    if (discount_note) packageData.discount_note = discount_note;

    // Insert package into database
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .insert([packageData])
      .select();

    if (error) {
      console.error('Error creating package:', error);
      return NextResponse.json({ 
        error: "Failed to create package",
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data?.[0] || null,
      message: "Package created successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Packages API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}