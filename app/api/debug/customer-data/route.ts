/**
 * Debug Customer Data API
 * Comprehensive debugging tool for customer management data issues
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface DebugIssue {
  type: string;
  message: string;
  error?: any;
  details?: any;
}

interface DebugData {
  customer?: any;
  transactionsSample?: any[];
  packagesSample?: any[];
  bookingsSample?: any[];
  apiResponses?: any;
}

interface DebugResponse {
  customerId: string;
  timestamp: string;
  issues: DebugIssue[];
  data: DebugData;
  summary?: {
    totalIssues: number;
    hasTransactions: boolean;
    hasPackages: boolean;
    hasBookings: boolean;
    customerPhone: string;
  };
}

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    
    if (!customerId) {
      return NextResponse.json({ error: "customer_id parameter required" }, { status: 400 });
    }

    const debug: DebugResponse = {
      customerId,
      timestamp: new Date().toISOString(),
      issues: [],
      data: {}
    };

    // 1. Check customer basic info
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      debug.issues.push({
        type: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found in database',
        error: customerError
      });
      return NextResponse.json(debug);
    }

    debug.data.customer = customer;

    // 2. Check transactions data
    const { data: transactionsSample, error: transactionsError } = await refacSupabaseAdmin
      .schema('pos')
      .from('lengolf_sales')
      .select('date, receipt_number, sales_net, sales_gross, item_price, customer_phone_number, is_voided')
      .or(`customer_id.eq.${customerId},customer_phone_number.eq.${customer.contact_number}`)
      .order('date', { ascending: false })
      .limit(5);

    if (transactionsError) {
      debug.issues.push({
        type: 'TRANSACTION_QUERY_ERROR',
        message: 'Error querying transactions',
        error: transactionsError
      });
    } else {
      debug.data.transactionsSample = transactionsSample;
      
      // Check for data quality issues
      const zeroAmountTransactions = transactionsSample?.filter((t: any) => 
        parseFloat(t.sales_net || '0') === 0 && 
        parseFloat(t.sales_gross || '0') === 0 && 
        parseFloat(t.item_price || '0') === 0
      ) || [];

      if (zeroAmountTransactions.length > 0) {
        debug.issues.push({
          type: 'ZERO_AMOUNT_TRANSACTIONS',
          message: `Found ${zeroAmountTransactions.length} transactions with zero amounts`,
          details: zeroAmountTransactions
        });
      }

      // Check for date issues
      const invalidDates = transactionsSample?.filter((t: any) => {
        try {
          const date = new Date(t.date);
          return isNaN(date.getTime());
        } catch {
          return true;
        }
      }) || [];

      if (invalidDates.length > 0) {
        debug.issues.push({
          type: 'INVALID_DATES',
          message: `Found ${invalidDates.length} transactions with invalid dates`,
          details: invalidDates
        });
      }
    }

    // 3. Check packages data
    const { data: packagesSample, error: packagesError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id, customer_name, purchase_date, expiration_date, first_use_date,
        package_types!inner(name, display_name, hours, type)
      `)
      .eq('customer_id', customerId)
      .limit(5);

    if (packagesError) {
      debug.issues.push({
        type: 'PACKAGES_QUERY_ERROR',
        message: 'Error querying packages',
        error: packagesError
      });
    } else {
      debug.data.packagesSample = packagesSample;

      // Check for date issues in packages
      const invalidPackageDates = packagesSample?.filter((p: any) => {
        try {
          if (p.purchase_date) {
            const date = new Date(p.purchase_date);
            if (isNaN(date.getTime())) return true;
          }
          if (p.expiration_date) {
            const date = new Date(p.expiration_date);
            if (isNaN(date.getTime())) return true;
          }
          return false;
        } catch {
          return true;
        }
      }) || [];

      if (invalidPackageDates.length > 0) {
        debug.issues.push({
          type: 'INVALID_PACKAGE_DATES',
          message: `Found ${invalidPackageDates.length} packages with invalid dates`,
          details: invalidPackageDates
        });
      }
    }

    // 4. Check bookings data
    const { data: bookingsSample, error: bookingsError } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, date, start_time, booking_type, status, package_name, bay, duration, number_of_people')
      .eq('customer_id', customerId)
      .limit(5);

    if (bookingsError) {
      debug.issues.push({
        type: 'BOOKINGS_QUERY_ERROR',
        message: 'Error querying bookings',
        error: bookingsError
      });
    } else {
      debug.data.bookingsSample = bookingsSample;

      // Check for missing or invalid booking data
      const missingBayInfo = bookingsSample?.filter((b: any) => !b.bay || b.bay === 'Any') || [];
      if (missingBayInfo.length > 0) {
        debug.issues.push({
          type: 'MISSING_BAY_INFO',
          message: `Found ${missingBayInfo.length} bookings with missing bay information`,
          details: missingBayInfo
        });
      }

      const missingDuration = bookingsSample?.filter((b: any) => !b.duration || b.duration === 'N/A') || [];
      if (missingDuration.length > 0) {
        debug.issues.push({
          type: 'MISSING_DURATION',
          message: `Found ${missingDuration.length} bookings with missing duration`,
          details: missingDuration
        });
      }
    }

    // 5. Test API endpoint responses
    try {
      const transactionsResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/transactions`);
      const transactionsData = await transactionsResponse.json();
      debug.data.apiResponses = {
        transactions: {
          status: transactionsResponse.status,
          data: transactionsData
        }
      };
    } catch (error) {
      debug.issues.push({
        type: 'API_ENDPOINT_ERROR',
        message: 'Error testing API endpoints',
        error: error
      });
    }

    // Summary
    debug.summary = {
      totalIssues: debug.issues.length,
      hasTransactions: (transactionsSample?.length || 0) > 0,
      hasPackages: (packagesSample?.length || 0) > 0,
      hasBookings: (bookingsSample?.length || 0) > 0,
      customerPhone: customer.contact_number
    };

    return NextResponse.json(debug);

  } catch (error: any) {
    console.error('Error in debug customer data:', error);
    return NextResponse.json(
      { error: "Debug failed", details: error.message },
      { status: 500 }
    );
  }
}