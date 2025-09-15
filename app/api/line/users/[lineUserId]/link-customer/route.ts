import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { customerId } = await request.json();
    const { lineUserId } = await params;

    if (!customerId || !lineUserId) {
      return NextResponse.json({
        error: "Missing customerId or lineUserId"
      }, { status: 400 });
    }

    // First, get the LINE user details for updating customer_profiles
    const { data: lineUser, error: lineUserError } = await refacSupabaseAdmin
      .from('line_users')
      .select('line_user_id, display_name, picture_url')
      .eq('line_user_id', lineUserId)
      .single();

    if (lineUserError || !lineUser) {
      return NextResponse.json({
        error: "LINE user not found"
      }, { status: 404 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, customer_code')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({
        error: "Customer not found"
      }, { status: 404 });
    }

    // Update line_users table with customer_id
    const { error: linkError } = await refacSupabaseAdmin
      .from('line_users')
      .update({
        customer_id: customerId,
        updated_at: new Date().toISOString()
      })
      .eq('line_user_id', lineUserId);

    if (linkError) {
      console.error('Error linking LINE user to customer:', linkError);
      return NextResponse.json({
        error: "Failed to link LINE user to customer"
      }, { status: 500 });
    }

    // Update customer_profiles JSONB field
    const lineProfileData = {
      line_user_id: lineUser.line_user_id,
      display_name: lineUser.display_name,
      picture_url: lineUser.picture_url,
      linked_at: new Date().toISOString()
    };

    // Get current customer_profiles and update with LINE data
    const { data: currentCustomer } = await refacSupabaseAdmin
      .from('customers')
      .select('customer_profiles')
      .eq('id', customerId)
      .single();

    let updatedProfiles;
    try {
      const current = currentCustomer?.customer_profiles;
      if (typeof current === 'string') {
        updatedProfiles = current === '[]' ? { line: lineProfileData } : { ...JSON.parse(current), line: lineProfileData };
      } else {
        updatedProfiles = { ...current, line: lineProfileData };
      }
    } catch {
      updatedProfiles = { line: lineProfileData };
    }

    const { error: profileError } = await refacSupabaseAdmin
      .from('customers')
      .update({ customer_profiles: updatedProfiles })
      .eq('id', customerId);

    if (profileError) {
      console.error('Error updating customer profiles:', profileError);
      // Continue even if profile update fails - the main linking succeeded
    }

    return NextResponse.json({
      success: true,
      message: "LINE user successfully linked to customer",
      data: {
        lineUserId: lineUser.line_user_id,
        customerId: customer.id,
        customerName: customer.customer_name,
        customerCode: customer.customer_code
      }
    });

  } catch (error) {
    console.error('Error linking LINE user to customer:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}