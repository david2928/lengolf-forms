import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { BillDataService } from '@/lib/bill-data-service';
import { ReceiptFormatter } from '@/lib/receipt-formatter';

export async function POST(request: NextRequest) {
  console.log('📄 Print Bill USB API: Request received');

  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tableSessionId } = body;

    if (!tableSessionId) {
      return NextResponse.json({ 
        error: "Missing required field: tableSessionId" 
      }, { status: 400 });
    }

    // Validate table session ID format
    if (!BillDataService.isValidTableSessionId(tableSessionId)) {
      return NextResponse.json({ 
        error: "Invalid table session ID format" 
      }, { status: 400 });
    }

    console.log('📄 Print Bill USB: Fetching bill data for table session', tableSessionId);

    // Get bill data
    let billData;
    try {
      billData = await BillDataService.getBillData(tableSessionId);
    } catch (error) {
      console.error('❌ Print Bill USB: Error fetching bill data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ 
        error: `Failed to fetch bill data: ${errorMessage}` 
      }, { status: 404 });
    }

    // Convert bill data to receipt format for printing
    const receiptData = BillDataService.convertBillToReceiptData(billData);

    console.log('✅ Print Bill USB: Bill data prepared successfully', {
      tableSessionId: billData.tableSessionId,
      tableNumber: billData.tableNumber,
      itemCount: billData.items.length,
      total: billData.total
    });

    // Generate ESC/POS thermal data
    const escposData = ReceiptFormatter.generateESCPOSData(receiptData);

    // Return success response with bill data
    // The client-side service will handle the actual USB printing
    return NextResponse.json({
      success: true,
      billData: receiptData,
      escposData: Array.from(escposData), // Convert Uint8Array to regular array for JSON
      message: `Bill for table ${billData.tableNumber} ready for USB printing`,
      method: 'WebUSB API',
      summary: BillDataService.getBillSummary(billData)
    });

  } catch (error) {
    console.error('❌ Print Bill USB API: Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false,
      error: `Bill printing failed: ${errorMessage}` 
    }, { status: 500 });
  }
}