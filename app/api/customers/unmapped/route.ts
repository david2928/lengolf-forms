/**
 * API endpoint for fetching unmapped bookings and sales records
 * Used by the customer mapping admin UI
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface UnmappedRecord {
  id: string;
  type: 'booking' | 'sale' | 'package';
  date: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  amount?: number;
  details: string;
  normalizedPhone: string;
  suggestedCustomers?: Array<{
    id: string;
    customerCode: string;
    customerName: string;
    contactNumber: string;
    matchScore: number;
    matchReason: string;
  }>;
}

interface GroupedUnmappedRecord {
  groupKey: string;
  customerName: string;
  phoneNumber: string;
  normalizedPhone: string;
  email?: string;
  recordCount: number;
  bookingCount: number;
  salesCount: number;
  packageCount: number;
  totalAmount: number;
  latestDate: string;
  oldestDate: string;
  recordIds: string[];
  suggestedCustomers?: Array<{
    id: string;
    customerCode: string;
    customerName: string;
    contactNumber: string;
    matchScore: number;
    matchReason: string;
  }>;
}

// GET /api/customers/unmapped - Get unmapped bookings and sales
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // 'booking', 'sale', 'package', or 'all'
    const limit = parseInt(searchParams.get('limit') || '20'); // Reduced default limit
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    const unmappedRecords: UnmappedRecord[] = [];

    // Fetch unmapped bookings
    if (type === 'booking' || type === 'all') {
      const { data: bookings, error: bookingError } = await refacSupabaseAdmin
        .from('bookings')
        .select(`
          id,
          date,
          name,
          phone_number,
          email,
          duration,
          status,
          bay
        `)
        .is('customer_id', null)
        .not('phone_number', 'is', null)
        .eq('status', 'confirmed')
        .order('date', { ascending: false })
        .limit(limit);

      if (bookingError) throw bookingError;

      for (const booking of bookings || []) {
        // Skip if search term doesn't match
        if (search && !booking.name?.toLowerCase().includes(search.toLowerCase()) &&
            !booking.phone_number?.includes(search) &&
            !booking.email?.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }

        const normalizedPhone = await getNormalizedPhone(booking.phone_number);
        
        // Find suggested customers (simplified for performance)
        const suggestions = await findSuggestedCustomers(
          normalizedPhone,
          booking.name,
          booking.email
        );

        unmappedRecords.push({
          id: booking.id,
          type: 'booking',
          date: booking.date,
          customerName: booking.name || 'Unknown',
          phoneNumber: booking.phone_number || '',
          email: booking.email,
          amount: undefined, // bookings don't have a price field
          details: `${booking.duration}min ${booking.status} - Bay ${booking.bay}`,
          normalizedPhone,
          suggestedCustomers: suggestions
        });
      }
    }

    // Fetch unmapped sales
    if (type === 'sale' || type === 'all') {
      const { data: sales, error: salesError } = await refacSupabaseAdmin
        .schema('pos')
        .from('lengolf_sales')
        .select(`
          receipt_number,
          date,
          customer_name,
          customer_phone_number,
          sales_net,
          payment_method
        `)
        .is('customer_id', null)
        .not('customer_phone_number', 'is', null)
        .eq('is_voided', false)
        .order('date', { ascending: false })
        .limit(limit);

      if (salesError) throw salesError;

      for (const sale of sales || []) {
        // Skip if search term doesn't match
        if (search && !sale.customer_name?.toLowerCase().includes(search.toLowerCase()) &&
            !sale.customer_phone_number?.includes(search)) {
          continue;
        }

        const normalizedPhone = await getNormalizedPhone(sale.customer_phone_number);
        
        // Find suggested customers
        const suggestions = await findSuggestedCustomers(
          normalizedPhone,
          sale.customer_name,
          null
        );

        unmappedRecords.push({
          id: sale.receipt_number,
          type: 'sale',
          date: sale.date,
          customerName: sale.customer_name || 'Unknown',
          phoneNumber: sale.customer_phone_number || '',
          amount: sale.sales_net,
          details: `Receipt: ${sale.receipt_number} (${sale.payment_method})`,
          normalizedPhone,
          suggestedCustomers: suggestions
        });
      }
    }

    // Fetch unmapped packages
    if (type === 'package' || type === 'all') {
      const { data: packages, error: packagesError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('packages')
        .select(`
          id,
          customer_name,
          package_type_id,
          created_at,
          first_use_date,
          expiration_date,
          package_types!inner(name, display_name)
        `)
        .is('customer_id', null)
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (packagesError) throw packagesError;

      for (const pkg of packages || []) {
        // Extract phone number from customer_name in format "Name (phone)"
        const phoneMatch = pkg.customer_name?.match(/\(([^)]+)\)$/);
        const phoneNumber = phoneMatch ? phoneMatch[1] : '';
        const customerName = pkg.customer_name?.replace(/\s*\([^)]+\)$/, '') || 'Unknown';
        
        // Skip if no phone number found
        if (!phoneNumber) continue;

        // Skip if search term doesn't match
        if (search && !customerName.toLowerCase().includes(search.toLowerCase()) &&
            !phoneNumber.includes(search)) {
          continue;
        }

        const normalizedPhone = await getNormalizedPhone(phoneNumber);
        
        // Find suggested customers
        const suggestions = await findSuggestedCustomers(
          normalizedPhone,
          customerName,
          null
        );

        unmappedRecords.push({
          id: pkg.id.toString(),
          type: 'package',
          date: pkg.created_at,
          customerName: customerName,
          phoneNumber: phoneNumber,
          amount: undefined, // packages don't have amount in this table
          details: `${(pkg as any).package_types.display_name}${pkg.first_use_date ? ' (Used)' : ' (Unused)'}`,
          normalizedPhone,
          suggestedCustomers: suggestions
        });
      }
    }

    // Group records by phone number and customer name
    const groupedRecords = new Map<string, GroupedUnmappedRecord>();
    
    for (const record of unmappedRecords) {
      const groupKey = `${record.normalizedPhone}|${record.customerName.toLowerCase().trim()}`;
      
      if (groupedRecords.has(groupKey)) {
        const group = groupedRecords.get(groupKey)!;
        group.recordCount++;
        group.recordIds.push(record.id);
        
        if (record.type === 'booking') {
          group.bookingCount++;
        } else if (record.type === 'sale') {
          group.salesCount++;
          group.totalAmount += record.amount || 0;
        } else if (record.type === 'package') {
          group.packageCount++;
          group.totalAmount += record.amount || 0;
        }
        
        // Update date range
        const recordDate = new Date(record.date);
        if (recordDate > new Date(group.latestDate)) {
          group.latestDate = record.date;
        }
        if (recordDate < new Date(group.oldestDate)) {
          group.oldestDate = record.date;
        }
        
        // Update email if we don't have one or if this one is better
        if (!group.email || (record.email && record.email !== 'info@len.golf')) {
          group.email = record.email;
        }
      } else {
        // Find suggested customers for this group
        const suggestions = await findSuggestedCustomers(
          record.normalizedPhone,
          record.customerName,
          record.email || null
        );
        
        groupedRecords.set(groupKey, {
          groupKey,
          customerName: record.customerName,
          phoneNumber: record.phoneNumber,
          normalizedPhone: record.normalizedPhone,
          email: record.email,
          recordCount: 1,
          bookingCount: record.type === 'booking' ? 1 : 0,
          salesCount: record.type === 'sale' ? 1 : 0,
          packageCount: record.type === 'package' ? 1 : 0,
          totalAmount: (record.type === 'sale' || record.type === 'package') ? (record.amount || 0) : 0,
          latestDate: record.date,
          oldestDate: record.date,
          recordIds: [record.id],
          suggestedCustomers: suggestions
        });
      }
    }

    // Convert to array and sort by record count (most records first)
    const groupedArray = Array.from(groupedRecords.values()).sort((a, b) => {
      // Primary sort: record count (more records first)
      if (a.recordCount !== b.recordCount) {
        return b.recordCount - a.recordCount;
      }
      // Secondary sort: suggested customers (groups with suggestions first)
      if (a.suggestedCustomers?.length && !b.suggestedCustomers?.length) return -1;
      if (!a.suggestedCustomers?.length && b.suggestedCustomers?.length) return 1;
      // Finally by latest date (most recent first) as tiebreaker
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });

    // Get total counts for display (actual database counts)
    const { count: totalBookingCount } = await refacSupabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .is('customer_id', null)
      .not('phone_number', 'is', null)
      .eq('status', 'confirmed');

    const { count: totalSalesCount } = await refacSupabaseAdmin
      .schema('pos')
      .from('lengolf_sales')
      .select('*', { count: 'exact', head: true })
      .is('customer_id', null)
      .not('customer_phone_number', 'is', null)
      .eq('is_voided', false);

    const { count: totalPackageCount } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .is('customer_id', null)
      .not('customer_name', 'is', null);

    return NextResponse.json({
      records: groupedArray.slice(0, limit), // Apply limit to grouped results
      totals: {
        unmappedBookings: totalBookingCount || 0,
        unmappedSales: totalSalesCount || 0,
        unmappedPackages: totalPackageCount || 0,
        total: (totalBookingCount || 0) + (totalSalesCount || 0) + (totalPackageCount || 0)
      },
      pagination: {
        limit,
        offset,
        hasMore: groupedArray.length > limit
      }
    });

  } catch (error: any) {
    console.error('Error fetching unmapped records:', error);
    return NextResponse.json(
      { error: "Failed to fetch unmapped records", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to normalize phone numbers
async function getNormalizedPhone(phone: string | null): Promise<string> {
  if (!phone) return '';
  
  try {
    const { data } = await refacSupabaseAdmin
      .rpc('normalize_phone_number', { phone_input: phone });
    
    return data || '';
  } catch {
    return '';
  }
}

// Helper function to find suggested customers (optimized for performance)
async function findSuggestedCustomers(
  normalizedPhone: string,
  _customerName: string | null,
  _email: string | null
): Promise<UnmappedRecord['suggestedCustomers']> {
  const suggestions = [];

  // Only try exact phone match for performance - most reliable anyway
  if (normalizedPhone && normalizedPhone.length >= 9) {
    const { data: phoneMatch } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_code, customer_name, contact_number')
      .eq('normalized_phone', normalizedPhone)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (phoneMatch) {
      suggestions.push({
        id: phoneMatch.id,
        customerCode: phoneMatch.customer_code,
        customerName: phoneMatch.customer_name,
        contactNumber: phoneMatch.contact_number || '',
        matchScore: 100,
        matchReason: 'Phone number match'
      });
    }
  }

  return suggestions;
}

// POST /api/customers/unmapped - Update customer ID for booking or sale
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recordIds, customerId } = body;

    if ((!recordIds || !Array.isArray(recordIds)) || !customerId) {
      return NextResponse.json(
        { error: "Missing required fields: recordIds (array) and customerId" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_code, customer_name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    let updatedBookings = 0;
    let updatedSales = 0;
    let updatedPackages = 0;
    const errors = [];

    // Update bookings that start with 'BK'
    const bookingIds = recordIds.filter(id => id.startsWith('BK'));
    if (bookingIds.length > 0) {
      const { data, error } = await refacSupabaseAdmin
        .from('bookings')
        .update({ 
          customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .in('id', bookingIds)
        .select('id');

      if (error) {
        errors.push(`Booking update error: ${error.message}`);
      } else {
        updatedBookings = data?.length || 0;
      }
    }

    // Helper function to detect UUID format
    const isUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    // Update packages (UUID format)
    const packageIds = recordIds.filter(id => isUUID(id));
    if (packageIds.length > 0) {
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('packages')
        .update({ 
          customer_id: customerId
        })
        .in('id', packageIds)
        .select('id');

      if (error) {
        errors.push(`Package update error: ${error.message}`);
      } else {
        updatedPackages = data?.length || 0;
      }
    }

    // Update sales (receipt numbers - non-BK, non-UUID IDs)
    const salesIds = recordIds.filter(id => !id.startsWith('BK') && !isUUID(id));
    if (salesIds.length > 0) {
      const { data, error } = await refacSupabaseAdmin
        .schema('pos')
        .from('lengolf_sales')
        .update({ 
          customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .in('receipt_number', salesIds)
        .select('receipt_number');

      if (error) {
        errors.push(`Sales update error: ${error.message}`);
      } else {
        updatedSales = data?.length || 0;
      }
    }

    const totalUpdated = updatedBookings + updatedSales + updatedPackages;
    
    if (totalUpdated === 0) {
      return NextResponse.json(
        { error: "No records were updated. " + (errors.length > 0 ? errors.join(', ') : '') },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${totalUpdated} records linked to customer ${customer.customer_code}`,
      customer: customer,
      updatedCounts: {
        bookings: updatedBookings,
        sales: updatedSales,
        packages: updatedPackages,
        total: totalUpdated
      },
      errors: errors.length > 0 ? errors : null
    });

  } catch (error: any) {
    console.error('Error updating customer link:', error);
    return NextResponse.json(
      { error: "Failed to update customer link", details: error.message },
      { status: 500 }
    );
  }
}