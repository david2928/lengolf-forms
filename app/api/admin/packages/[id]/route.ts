import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
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

    const { id } = await params;
    const packageId = id;

    const { data: packageData, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        *,
        package_types:package_type_id (
          id,
          name,
          hours,
          type,
          display_name
        ),
        package_usage (
          id,
          used_hours,
          used_date,
          employee_name,
          booking_id,
          created_at,
          modified_by,
          modification_reason
        )
      `)
      .eq('id', packageId)
      .single();

    if (error) {
      throw error;
    }

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Calculate totals
    const totalUsedHours = packageData.package_usage.reduce((sum: number, usage: any) => 
      sum + parseFloat(usage.used_hours), 0
    );
    
    const isUnlimited = !packageData.package_types.hours;
    const remainingHours = isUnlimited 
      ? null 
      : Math.max(0, parseFloat(packageData.package_types.hours) - totalUsedHours);

    const enrichedPackage = {
      ...packageData,
      total_used_hours: totalUsedHours,
      remaining_hours: remainingHours,
      is_unlimited: isUnlimited,
      package_type_name: packageData.package_types.display_name || packageData.package_types.name,
      total_hours: packageData.package_types.hours
    };

    return NextResponse.json({ data: enrichedPackage });

  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const { id } = await params;
    const packageId = id;
    const data = await request.json();
    const {
      package_type_id,
      purchase_date,
      expiration_date,
      first_use_date,
      employee_name,
      modification_notes
    } = data;

    // Validate required fields
    if (!package_type_id || !purchase_date || !expiration_date) {
      return NextResponse.json(
        { error: 'Package type, purchase date, and expiration date are required' },
        { status: 400 }
      );
    }

    // Update package with tracking - DO NOT update customer info
    const { data: updatedPackage, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .update({
        package_type_id: parseInt(package_type_id),
        purchase_date,
        expiration_date,
        first_use_date: first_use_date || null,
        employee_name: employee_name || null,
        last_modified_by: session.user.email,
        modification_notes: modification_notes || 'Package updated via admin interface'
      })
      .eq('id', packageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Package updated successfully',
      data: updatedPackage
    });

  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id } = await params;
    const packageId = id;

    // First check if package has usage records
    const { data: usageRecords, error: usageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .select('id')
      .eq('package_id', packageId);

    if (usageError) {
      throw usageError;
    }

    if (usageRecords && usageRecords.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete package with usage records. Delete usage records first.' },
        { status: 400 }
      );
    }

    // Delete package
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .delete()
      .eq('id', packageId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Package deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}