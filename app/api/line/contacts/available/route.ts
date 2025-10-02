import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get all available LINE contacts (users with LINE IDs)
 * GET /api/line/contacts/available
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    // Get all LINE users with customer information (only those linked to customers)
    const { data, error } = await refacSupabaseAdmin
      .from('line_users')
      .select(`
        line_user_id,
        customer_id,
        display_name,
        customers!inner (
          customer_name,
          contact_number
        )
      `)
      .not('line_user_id', 'is', null)
      .not('customer_id', 'is', null);

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    // Format the response
    const contacts = (data || []).map((item: any) => ({
      line_user_id: item.line_user_id,
      customer_id: item.customer_id,
      display_name: item.display_name,
      customer_name: item.customers?.customer_name || 'Unknown',
      contact_number: item.customers?.contact_number || 'N/A'
    }));

    return NextResponse.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
