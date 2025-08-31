import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { toCustomerId, reason } = await request.json();
    const { id } = await params;
    const packageId = id;
    const adminUser = session.user.email;

    // Validate inputs
    if (!toCustomerId || !reason?.trim()) {
      return NextResponse.json(
        { error: 'Customer ID and reason are required' },
        { status: 400 }
      );
    }

    // Get new customer details from public schema
    const { data: newCustomer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('customer_name')
      .eq('id', toCustomerId)
      .single();

    if (customerError || !newCustomer) {
      console.error('Customer lookup error:', customerError);
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get current package details for history
    const { data: currentPackage, error: currentError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select('customer_name, customer_id')
      .eq('id', packageId)
      .single();

    if (currentError) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    // Update package with tracking
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .update({
        customer_id: toCustomerId,
        customer_name: newCustomer.customer_name,
        last_modified_by: adminUser,
        modification_notes: `Transferred from ${currentPackage.customer_name} to ${newCustomer.customer_name}. Reason: ${reason}`
      })
      .eq('id', packageId);

    if (error) {
      throw error;
    }

    // Get updated package details with customer from public schema
    const { data: updatedPackage, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        *,
        package_types:package_type_id (name, display_name)
      `)
      .eq('id', packageId)
      .single();

    if (fetchError) {
      throw fetchError;
    }
    
    // Fetch customer details separately from public schema
    if (updatedPackage?.customer_id) {
      const { data: customerData } = await refacSupabaseAdmin
        .from('customers')
        .select('customer_name')
        .eq('id', updatedPackage.customer_id)
        .single();
      
      if (customerData) {
        updatedPackage.customers = customerData;
      }
    }

    return NextResponse.json({
      message: 'Package transferred successfully',
      data: updatedPackage
    });

  } catch (error) {
    console.error('Error transferring package:', error);
    return NextResponse.json(
      { error: 'Failed to transfer package' },
      { status: 500 }
    );
  }
}