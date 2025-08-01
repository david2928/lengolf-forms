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
    const { receiptNumber } = body as { receiptNumber: string };

    console.log('📱 Bluetooth Print API: Request received', { receiptNumber });

    if (!receiptNumber || !ReceiptDataService.isValidReceiptNumber(receiptNumber)) {
      return NextResponse.json({
        error: 'Valid receipt number is required'
      }, { status: 400 });
    }

    // Get receipt data using shared service
    const receiptData = await ReceiptDataService.getReceiptData(receiptNumber);
    const summary = ReceiptDataService.getReceiptSummary(receiptData);

    console.log('✅ Bluetooth Print API: Receipt data prepared', summary);

    // Return receipt data for client-side Bluetooth printing
    return NextResponse.json({
      success: true,
      message: 'Receipt data ready for Bluetooth printing',
      receiptData: receiptData,
      method: 'Web Bluetooth API',
      itemCount: summary.itemCount,
      total: summary.total
    });

  } catch (error) {
    console.error('❌ Bluetooth Print API: Error:', error);
    return NextResponse.json({
      error: 'Failed to prepare receipt data',
      details: error instanceof Error ? error.message : 'Unknown error',
      method: 'Web Bluetooth API'
    }, { status: 500 });
  }
}