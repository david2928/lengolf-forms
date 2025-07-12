/**
 * API endpoint for managing duplicate customers
 * Used by the duplicate customer management admin UI
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface DuplicateCustomerGroup {
  contact_number: string;
  customer_count: number;
  customers: Array<{
    id: string;
    customer_code: string;
    customer_name: string;
    contact_number: string;
    email: string | null;
    created_at: string;
    total_visits: number;
    total_lifetime_value: number;
    last_visit_date: string | null;
    bookings_count: number;
    sales_count: number;
    packages_count: number;
  }>;
  suggested_primary_id: string;
  merge_conflicts: {
    different_names: boolean;
    different_emails: boolean;
  };
}

// GET /api/customers/duplicates - Get duplicate customers grouped by contact_number
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeTestData = searchParams.get('includeTestData') === 'true';

    // First, find all contact numbers that have duplicates
    const { data: duplicateNumbers, error: dupError } = await refacSupabaseAdmin
      .from('customers')
      .select('contact_number')
      .not('contact_number', 'is', null)
      .not('contact_number', 'eq', '')
      .order('contact_number');

    if (dupError) throw dupError;

    // Group by contact number and count
    const contactCounts = new Map<string, number>();
    duplicateNumbers?.forEach(row => {
      const count = contactCounts.get(row.contact_number) || 0;
      contactCounts.set(row.contact_number, count + 1);
    });

    // Filter to only keep duplicates
    const duplicateContactNumbers = Array.from(contactCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([contact, count]) => ({ contact, count }))
      .sort((a, b) => b.count - a.count); // Sort by most duplicates first

    // Filter out test data if requested
    let filteredDuplicates = duplicateContactNumbers;
    if (!includeTestData) {
      const testPatterns = ['0', '7777', '123456', '999999', '111222333'];
      filteredDuplicates = duplicateContactNumbers.filter(
        ({ contact }) => !testPatterns.includes(contact)
      );
    }

    // Apply search filter
    if (search) {
      filteredDuplicates = filteredDuplicates.filter(({ contact }) => 
        contact.includes(search)
      );
    }

    // Get detailed info for each duplicate group (limited)
    const duplicateGroups: DuplicateCustomerGroup[] = [];
    const limitedDuplicates = filteredDuplicates.slice(0, limit);

    for (const { contact, count } of limitedDuplicates) {
      // Get all customers with this contact number
      const { data: customers, error: custError } = await refacSupabaseAdmin
        .from('customers')
        .select(`
          id,
          customer_code,
          customer_name,
          contact_number,
          email,
          created_at,
          total_visits,
          total_lifetime_value,
          last_visit_date
        `)
        .eq('contact_number', contact)
        .order('created_at');

      if (custError) throw custError;

      // Get usage counts for each customer
      const customersWithCounts = await Promise.all(
        (customers || []).map(async (customer) => {
          // Count bookings
          const { count: bookingsCount } = await refacSupabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customer.id);

          // Count sales
          const { count: salesCount } = await refacSupabaseAdmin
            .schema('pos')
            .from('lengolf_sales')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customer.id);

          // Count packages
          const { count: packagesCount } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('packages')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customer.id);

          return {
            ...customer,
            bookings_count: bookingsCount || 0,
            sales_count: salesCount || 0,
            packages_count: packagesCount || 0
          };
        })
      );

      // Determine suggested primary (oldest with most usage)
      const suggestedPrimary = customersWithCounts.reduce((best, current) => {
        const currentScore = current.bookings_count + current.sales_count + current.packages_count;
        const bestScore = best.bookings_count + best.sales_count + best.packages_count;
        
        // Prefer customer with more usage, or oldest if tied
        if (currentScore > bestScore) return current;
        if (currentScore === bestScore && new Date(current.created_at) < new Date(best.created_at)) return current;
        return best;
      });

      // Check for merge conflicts
      const uniqueNames = new Set(customers?.map(c => c.customer_name));
      const uniqueEmails = new Set(customers?.filter(c => c.email).map(c => c.email));

      duplicateGroups.push({
        contact_number: contact,
        customer_count: count,
        customers: customersWithCounts,
        suggested_primary_id: suggestedPrimary.id,
        merge_conflicts: {
          different_names: uniqueNames.size > 1,
          different_emails: uniqueEmails.size > 1
        }
      });
    }

    // Get total counts
    const totalDuplicateGroups = filteredDuplicates.length;
    const totalDuplicateCustomers = filteredDuplicates.reduce((sum, { count }) => sum + count, 0);
    const totalExtraCustomers = totalDuplicateCustomers - totalDuplicateGroups;

    return NextResponse.json({
      groups: duplicateGroups,
      totals: {
        duplicate_groups: totalDuplicateGroups,
        duplicate_customers: totalDuplicateCustomers,
        extra_customers: totalExtraCustomers
      },
      pagination: {
        limit,
        hasMore: filteredDuplicates.length > limit
      }
    });

  } catch (error: any) {
    console.error('Error fetching duplicate customers:', error);
    return NextResponse.json(
      { error: "Failed to fetch duplicate customers", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/customers/duplicates/merge - Merge duplicate customers
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { primaryCustomerId, duplicateCustomerIds, mergeStrategy = 'keep_primary' } = body;

    if (!primaryCustomerId || !duplicateCustomerIds || !Array.isArray(duplicateCustomerIds)) {
      return NextResponse.json(
        { error: "Missing required fields: primaryCustomerId and duplicateCustomerIds (array)" },
        { status: 400 }
      );
    }

    // Verify all customers exist
    const allCustomerIds = [primaryCustomerId, ...duplicateCustomerIds];
    const { data: customers, error: verifyError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, total_visits, total_lifetime_value')
      .in('id', allCustomerIds);

    if (verifyError || customers?.length !== allCustomerIds.length) {
      return NextResponse.json(
        { error: "One or more customers not found" },
        { status: 404 }
      );
    }

    const primaryCustomer = customers.find(c => c.id === primaryCustomerId);
    if (!primaryCustomer) {
      return NextResponse.json(
        { error: "Primary customer not found" },
        { status: 404 }
      );
    }

    // Start transaction-like operations
    let updatedBookings = 0;
    let updatedSales = 0;
    let updatedPackages = 0;
    const errors = [];

    // Update all bookings to point to primary customer
    const { data: bookingData, error: bookingError } = await refacSupabaseAdmin
      .from('bookings')
      .update({ 
        customer_id: primaryCustomerId,
        updated_at: new Date().toISOString()
      })
      .in('customer_id', duplicateCustomerIds)
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
      .in('customer_id', duplicateCustomerIds)
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
      .in('customer_id', duplicateCustomerIds)
      .select('id');

    if (packageError) {
      errors.push(`Package update error: ${packageError.message}`);
    } else {
      updatedPackages = packageData?.length || 0;
    }

    // If merge strategy is 'combine_data', update the primary customer with combined values
    if (mergeStrategy === 'combine_data') {
      const totalVisits = customers.reduce((sum, c) => sum + (c.total_visits || 0), 0);
      const totalValue = customers.reduce((sum, c) => sum + (c.total_lifetime_value || 0), 0);

      const { error: updateError } = await refacSupabaseAdmin
        .from('customers')
        .update({
          total_visits: totalVisits,
          total_lifetime_value: totalValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', primaryCustomerId);

      if (updateError) {
        errors.push(`Primary customer update error: ${updateError.message}`);
      }
    }

    // Update any profiles to point to primary customer before deletion
    const { error: profileError } = await refacSupabaseAdmin
      .from('profiles')
      .update({ 
        customer_id: primaryCustomerId,
        updated_at: new Date().toISOString()
      })
      .in('customer_id', duplicateCustomerIds);

    if (profileError) {
      errors.push(`Profile update error: ${profileError.message}`);
    }

    // Delete duplicate customers
    const { error: deleteError } = await refacSupabaseAdmin
      .from('customers')
      .delete()
      .in('id', duplicateCustomerIds);

    if (deleteError) {
      errors.push(`Customer deletion error: ${deleteError.message}`);
    }

    const totalUpdated = updatedBookings + updatedSales + updatedPackages;

    return NextResponse.json({
      success: true,
      message: `Merged ${duplicateCustomerIds.length} customers into primary customer`,
      primary_customer: primaryCustomer,
      merged_counts: {
        bookings: updatedBookings,
        sales: updatedSales,
        packages: updatedPackages,
        total: totalUpdated
      },
      deleted_customers: duplicateCustomerIds.length,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error: any) {
    console.error('Error merging customers:', error);
    return NextResponse.json(
      { error: "Failed to merge customers", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/duplicates - Delete duplicate customers
export async function DELETE(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerIds } = body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: customerIds (array)" },
        { status: 400 }
      );
    }

    // Check if any customers have associated records
    const warnings = [];
    
    for (const customerId of customerIds) {
      const { count: bookingCount } = await refacSupabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      const { count: salesCount } = await refacSupabaseAdmin
        .schema('pos')
        .from('lengolf_sales')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      const { count: packageCount } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      const totalAssociated = (bookingCount || 0) + (salesCount || 0) + (packageCount || 0);
      
      if (totalAssociated > 0) {
        warnings.push({
          customer_id: customerId,
          associated_records: totalAssociated,
          bookings: bookingCount || 0,
          sales: salesCount || 0,
          packages: packageCount || 0
        });
      }
    }

    // If there are warnings and no force flag, return warning
    if (warnings.length > 0 && !body.force) {
      return NextResponse.json({
        error: "Some customers have associated records",
        warnings,
        message: "Set 'force' to true to delete anyway"
      }, { status: 400 });
    }

    // Delete the customers
    const { data: deletedCustomers, error: deleteError } = await refacSupabaseAdmin
      .from('customers')
      .delete()
      .in('id', customerIds)
      .select('id, customer_name');

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete customers", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCustomers?.length || 0} customers`,
      deleted_customers: deletedCustomers,
      warnings: warnings.length > 0 ? warnings : null
    });

  } catch (error: any) {
    console.error('Error deleting customers:', error);
    return NextResponse.json(
      { error: "Failed to delete customers", details: error.message },
      { status: 500 }
    );
  }
}