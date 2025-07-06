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
      package_type_id, 
      purchase_date, 
      first_use_date 
    } = body;

    // Validate required fields
    if (!employee_name || !customer_name || !package_type_id || !purchase_date) {
      return NextResponse.json({ 
        error: "Missing required fields: employee_name, customer_name, package_type_id, purchase_date" 
      }, { status: 400 });
    }

    // Insert package into database
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .insert([{
        employee_name,
        customer_name,
        package_type_id,
        purchase_date,
        first_use_date: first_use_date || null
      }])
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