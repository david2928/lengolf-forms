import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const primaryId = searchParams.get('primaryId');
    const secondaryId = searchParams.get('secondaryId');

    if (!primaryId || !secondaryId) {
      return NextResponse.json(
        { error: "Missing primaryId or secondaryId parameters" },
        { status: 400 }
      );
    }

    // Get customer details
    const { data: customers, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select(`
        id,
        customer_code,
        customer_name,
        contact_number,
        email,
        address,
        total_visits,
        total_lifetime_value,
        alternate_phone_numbers,
        created_at
      `)
      .in('id', [primaryId, secondaryId]);

    if (customerError || !customers || customers.length !== 2) {
      return NextResponse.json(
        { error: "One or both customers not found" },
        { status: 404 }
      );
    }

    const primary = customers.find((c: any) => c.id === primaryId);
    const secondary = customers.find((c: any) => c.id === secondaryId);

    // Get counts for each customer
    const getCountsForCustomer = async (customerId: string) => {
      const [bookings, sales, packages, profiles] = await Promise.all([
        refacSupabaseAdmin
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        refacSupabaseAdmin
          .schema('pos')
          .from('lengolf_sales')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        refacSupabaseAdmin
          .schema('backoffice')
          .from('packages')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        refacSupabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId)
      ]);

      return {
        bookings: bookings.count || 0,
        sales: sales.count || 0,
        packages: packages.count || 0,
        profiles: profiles.count || 0
      };
    };

    const [primaryCounts, secondaryCounts] = await Promise.all([
      getCountsForCustomer(primaryId),
      getCountsForCustomer(secondaryId)
    ]);

    return NextResponse.json({
      primary: { ...primary, counts: primaryCounts },
      secondary: { ...secondary, counts: secondaryCounts },
      merge_preview: {
        will_be_merged: {
          bookings: secondaryCounts.bookings,
          sales: secondaryCounts.sales,
          packages: secondaryCounts.packages,
          profiles: secondaryCounts.profiles,
          total: Object.values(secondaryCounts).reduce((sum, count) => sum + count, 0)
        },
        resulting_totals: {
          visits: (primary.total_visits || 0) + (secondary.total_visits || 0),
          lifetime_value: (parseFloat(primary.total_lifetime_value || '0')) +
                         (parseFloat(secondary.total_lifetime_value || '0')),
          total_records: Object.values(primaryCounts).reduce((sum, count) => sum + count, 0) +
                        Object.values(secondaryCounts).reduce((sum, count) => sum + count, 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Error in merge preview:', error);
    return NextResponse.json(
      { error: "Failed to generate merge preview", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/customers/manual-merge - Merge any two customers manually
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { primaryCustomerId, secondaryCustomerId } = body;

    if (!primaryCustomerId || !secondaryCustomerId) {
      return NextResponse.json(
        { error: "Missing required fields: primaryCustomerId and secondaryCustomerId" },
        { status: 400 }
      );
    }

    if (primaryCustomerId === secondaryCustomerId) {
      return NextResponse.json(
        { error: "Cannot merge a customer with itself" },
        { status: 400 }
      );
    }

    // Get both customers with full details
    const { data: customers, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select(`
        id,
        customer_code,
        customer_name,
        contact_number,
        email,
        address,
        total_visits,
        total_lifetime_value,
        alternate_phone_numbers,
        merge_history,
        created_at
      `)
      .in('id', [primaryCustomerId, secondaryCustomerId]);

    if (customerError || !customers || customers.length !== 2) {
      return NextResponse.json(
        { error: "One or both customers not found" },
        { status: 404 }
      );
    }

    const primaryCustomer = customers.find((c: any) => c.id === primaryCustomerId);
    const secondaryCustomer = customers.find((c: any) => c.id === secondaryCustomerId);

    if (!primaryCustomer || !secondaryCustomer) {
      return NextResponse.json(
        { error: "Customer data error" },
        { status: 500 }
      );
    }

    // Start merge operations
    let updatedBookings = 0;
    let updatedSales = 0;
    let updatedPackages = 0;
    let updatedProfiles = 0;
    const errors = [];

    // Update all bookings to point to primary customer
    const { data: bookingData, error: bookingError } = await refacSupabaseAdmin
      .from('bookings')
      .update({
        customer_id: primaryCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', secondaryCustomerId)
      .select('id');

    if (bookingError) {
      errors.push(`Booking update error: ${bookingError.message}`);
    } else {
      updatedBookings = bookingData?.length || 0;
    }

    // Update all sales to point to primary customer
    const { data: salesData, error: salesError } = await refacSupabaseAdmin
      .schema('pos')
      .from('lengolf_sales')
      .update({
        customer_id: primaryCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', secondaryCustomerId)
      .select('receipt_number');

    if (salesError) {
      errors.push(`Sales update error: ${salesError.message}`);
    } else {
      updatedSales = salesData?.length || 0;
    }

    // Update all packages to point to primary customer
    const { data: packageData, error: packageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .update({
        customer_id: primaryCustomerId
      })
      .eq('customer_id', secondaryCustomerId)
      .select('id');

    if (packageError) {
      errors.push(`Package update error: ${packageError.message}`);
    } else {
      updatedPackages = packageData?.length || 0;
    }

    // Update all profiles to point to primary customer
    const { data: profileData, error: profileError } = await refacSupabaseAdmin
      .from('profiles')
      .update({
        customer_id: primaryCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', secondaryCustomerId)
      .select('id');

    if (profileError) {
      errors.push(`Profile update error: ${profileError.message}`);
    } else {
      updatedProfiles = profileData?.length || 0;
    }

    // Prepare phone numbers array - combine all unique phone numbers
    const allPhones = new Set();

    // Add current primary phone
    if (primaryCustomer.contact_number) {
      allPhones.add(primaryCustomer.contact_number);
    }

    // Add secondary phone
    if (secondaryCustomer.contact_number) {
      allPhones.add(secondaryCustomer.contact_number);
    }

    // Add any existing alternate phones from both customers
    if (primaryCustomer.alternate_phone_numbers) {
      primaryCustomer.alternate_phone_numbers.forEach((phone: string) => allPhones.add(phone));
    }
    if (secondaryCustomer.alternate_phone_numbers) {
      secondaryCustomer.alternate_phone_numbers.forEach((phone: string) => allPhones.add(phone));
    }

    // Remove the primary phone from alternates array
    const alternatePhones = Array.from(allPhones).filter(phone => phone !== primaryCustomer.contact_number);

    // Prepare merge history entry
    const mergeHistoryEntry = {
      merged_at: new Date().toISOString(),
      merged_by: session.user.email,
      secondary_customer: {
        id: secondaryCustomer.id,
        customer_code: secondaryCustomer.customer_code,
        customer_name: secondaryCustomer.customer_name,
        contact_number: secondaryCustomer.contact_number,
        email: secondaryCustomer.email
      },
      records_merged: {
        bookings: updatedBookings,
        sales: updatedSales,
        packages: updatedPackages,
        profiles: updatedProfiles
      }
    };

    // Combine merge history
    const existingHistory = primaryCustomer.merge_history || [];
    const updatedHistory = [...existingHistory, mergeHistoryEntry];

    // Update the primary customer with combined data and phone numbers
    const combinedVisits = (primaryCustomer.total_visits || 0) + (secondaryCustomer.total_visits || 0);
    const combinedValue = (parseFloat(primaryCustomer.total_lifetime_value || '0')) +
                         (parseFloat(secondaryCustomer.total_lifetime_value || '0'));

    const { error: updateError } = await refacSupabaseAdmin
      .from('customers')
      .update({
        total_visits: combinedVisits,
        total_lifetime_value: combinedValue.toString(),
        alternate_phone_numbers: alternatePhones,
        merge_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', primaryCustomerId);

    if (updateError) {
      errors.push(`Primary customer update error: ${updateError.message}`);
    }

    // Delete the secondary customer
    const { error: deleteError } = await refacSupabaseAdmin
      .from('customers')
      .delete()
      .eq('id', secondaryCustomerId);

    if (deleteError) {
      errors.push(`Secondary customer deletion error: ${deleteError.message}`);
    }

    const totalUpdated = updatedBookings + updatedSales + updatedPackages + updatedProfiles;

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${secondaryCustomer.customer_name} into ${primaryCustomer.customer_name}`,
      primary_customer: {
        id: primaryCustomer.id,
        customer_code: primaryCustomer.customer_code,
        customer_name: primaryCustomer.customer_name,
        contact_number: primaryCustomer.contact_number,
        alternate_phone_numbers: alternatePhones
      },
      secondary_customer: {
        id: secondaryCustomer.id,
        customer_code: secondaryCustomer.customer_code,
        customer_name: secondaryCustomer.customer_name
      },
      merged_counts: {
        bookings: updatedBookings,
        sales: updatedSales,
        packages: updatedPackages,
        profiles: updatedProfiles,
        total: totalUpdated
      },
      combined_stats: {
        total_visits: combinedVisits,
        total_lifetime_value: combinedValue
      },
      errors: errors.length > 0 ? errors : null
    });

  } catch (error: any) {
    console.error('Error in manual merge:', error);
    return NextResponse.json(
      { error: "Failed to merge customers", details: error.message },
      { status: 500 }
    );
  }
}