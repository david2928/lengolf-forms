import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { ReceiptDataService } from '@/lib/receipt-data-service';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { receiptNumber, taxInvoiceData } = body;

    console.log('📱 Bluetooth Tax Invoice Print API: Request received', { receiptNumber });

    if (!receiptNumber || !ReceiptDataService.isValidReceiptNumber(receiptNumber)) {
      return NextResponse.json({
        error: 'Valid receipt number is required'
      }, { status: 400 });
    }

    // Get tax invoice data using shared service
    const taxInvoiceReceiptData = await ReceiptDataService.getTaxInvoiceData(receiptNumber, taxInvoiceData);
    const summary = ReceiptDataService.getReceiptSummary(taxInvoiceReceiptData);

    console.log('✅ Bluetooth Tax Invoice API: Tax invoice data prepared', summary);

    // Return tax invoice data for client-side Bluetooth printing
    return NextResponse.json({
      success: true,
      message: 'Tax invoice data ready for Bluetooth printing',
      taxInvoiceData: taxInvoiceReceiptData,
      method: 'Web Bluetooth API',
      itemCount: summary.itemCount,
      total: summary.total
    });

  } catch (error) {
    console.error('❌ Bluetooth Tax Invoice API: Error:', error);
    return NextResponse.json({
      error: 'Failed to prepare tax invoice data',
      details: error instanceof Error ? error.message : 'Unknown error',
      method: 'Web Bluetooth API'
    }, { status: 500 });
  }
}