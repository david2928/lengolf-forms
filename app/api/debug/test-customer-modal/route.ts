/**
 * Test Customer Modal Data API
 * Tests data integrity for the customer detail modal with edge cases
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  details?: any;
  error?: string;
}

interface TestResponse {
  customerId: string;
  timestamp: string;
  tests: TestResult[];
  summary?: {
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    allPassed: boolean;
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

    const testResults: TestResponse = {
      customerId,
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Customer Basic Info
    try {
      const customerResponse = await fetch(`http://localhost:3000/api/customers/${customerId}`);
      const customerData = await customerResponse.json();
      
      testResults.tests.push({
        name: 'Customer Basic Info',
        status: customerResponse.ok ? 'PASS' : 'FAIL',
        details: {
          statusCode: customerResponse.status,
          hasCustomer: !!customerData.customer,
          customerName: customerData.customer?.customer_name,
          customerPhone: customerData.customer?.contact_number,
          isActive: customerData.customer?.is_active
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Customer Basic Info',
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Transactions API
    try {
      const transactionsResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/transactions`);
      const transactionsData = await transactionsResponse.json();
      
      // Test date formatting for each transaction
      const dateTests = transactionsData.transactions?.map((t: any) => {
        try {
          const date = new Date(t.date);
          return {
            receiptNumber: t.receipt_number,
            originalDate: t.date,
            isValidDate: !isNaN(date.getTime()),
            formattedDate: isNaN(date.getTime()) ? 'Invalid' : date.toISOString().split('T')[0]
          };
        } catch {
          return {
            receiptNumber: t.receipt_number,
            originalDate: t.date,
            isValidDate: false,
            formattedDate: 'Error'
          };
        }
      }) || [];

      // Test amount formatting
      const amountTests = transactionsData.transactions?.map((t: any) => {
        const amount = typeof t.sales_net === 'string' ? parseFloat(t.sales_net) : (t.sales_net || 0);
        return {
          receiptNumber: t.receipt_number,
          originalAmount: t.sales_net,
          parsedAmount: amount,
          isValidAmount: !isNaN(amount),
          formattedAmount: isNaN(amount) ? '฿0' : `฿${amount.toLocaleString()}`
        };
      }) || [];

      testResults.tests.push({
        name: 'Transactions API',
        status: transactionsResponse.ok ? 'PASS' : 'FAIL',
        details: {
          statusCode: transactionsResponse.status,
          totalTransactions: transactionsData.transactions?.length || 0,
          totalSpent: transactionsData.summary?.totalSpent,
          dateTests,
          amountTests,
          hasInvalidDates: dateTests.some((d: any) => !d.isValidDate),
          hasInvalidAmounts: amountTests.some((a: any) => !a.isValidAmount)
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Transactions API',
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Packages API
    try {
      const packagesResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/packages`);
      const packagesData = await packagesResponse.json();
      
      // Test package date formatting
      const packageDateTests = packagesData.packages?.map((p: any) => {
        const purchaseDate = p.purchase_date ? new Date(p.purchase_date) : null;
        const expiryDate = p.expiration_date ? new Date(p.expiration_date) : null;
        
        return {
          packageName: p.package_name,
          purchaseDate: {
            original: p.purchase_date,
            isValid: purchaseDate ? !isNaN(purchaseDate.getTime()) : false,
            formatted: purchaseDate && !isNaN(purchaseDate.getTime()) ? 
              purchaseDate.toISOString().split('T')[0] : 'Invalid'
          },
          expiryDate: {
            original: p.expiration_date,
            isValid: expiryDate ? !isNaN(expiryDate.getTime()) : true, // null is valid
            formatted: expiryDate ? 
              (!isNaN(expiryDate.getTime()) ? expiryDate.toISOString().split('T')[0] : 'Invalid') :
              'No expiry'
          },
          usesRemaining: p.uses_remaining,
          originalUses: p.original_uses,
          status: p.status
        };
      }) || [];

      testResults.tests.push({
        name: 'Packages API',
        status: packagesResponse.ok ? 'PASS' : 'FAIL',
        details: {
          statusCode: packagesResponse.status,
          totalPackages: packagesData.packages?.length || 0,
          activePackages: packagesData.summary?.active || 0,
          packageDateTests,
          hasInvalidPackageDates: packageDateTests.some((p: any) => 
            !p.purchaseDate.isValid || !p.expiryDate.isValid
          )
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Packages API',
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 4: Bookings API
    try {
      const bookingsResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/bookings`);
      const bookingsData = await bookingsResponse.json();
      
      // Test booking data completeness
      const bookingTests = bookingsData.bookings?.map((b: any) => {
        const date = new Date(b.date);
        return {
          bookingId: b.id,
          date: {
            original: b.date,
            isValid: !isNaN(date.getTime()),
            formatted: !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : 'Invalid'
          },
          time: b.time || 'N/A',
          type: b.type || 'Unknown',
          bay: b.bay || 'Any',
          duration: b.duration !== null ? `${b.duration}h` : 'N/A',
          packageUsed: b.package_used || 'No package',
          status: b.status || 'unknown'
        };
      }) || [];

      testResults.tests.push({
        name: 'Bookings API',
        status: bookingsResponse.ok ? 'PASS' : 'FAIL',
        details: {
          statusCode: bookingsResponse.status,
          totalBookings: bookingsData.bookings?.length || 0,
          upcomingBookings: bookingsData.summary?.upcoming || 0,
          bookingTests,
          hasInvalidBookingDates: bookingTests.some((b: any) => !b.date.isValid),
          missingBayInfo: bookingTests.filter((b: any) => b.bay === 'Any').length,
          missingDuration: bookingTests.filter((b: any) => b.duration === 'N/A').length
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Bookings API',
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Summary
    const passedTests = testResults.tests.filter(t => t.status === 'PASS').length;
    const failedTests = testResults.tests.filter(t => t.status === 'FAIL').length;
    const errorTests = testResults.tests.filter(t => t.status === 'ERROR').length;

    testResults.summary = {
      totalTests: testResults.tests.length,
      passed: passedTests,
      failed: failedTests,
      errors: errorTests,
      allPassed: passedTests === testResults.tests.length
    };

    return NextResponse.json(testResults);

  } catch (error: any) {
    console.error('Error in test customer modal:', error);
    return NextResponse.json(
      { error: "Test failed", details: error.message },
      { status: 500 }
    );
  }
}