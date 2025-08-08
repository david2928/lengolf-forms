import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config'; 
import { BillDataService } from '@/lib/bill-data-service';
import { ReceiptFormatter } from '@/lib/receipt-formatter';

export async function GET(
  request: NextRequest, 
  { params }: { params: { tableSessionId: string } }
) {
  console.log('📄 Get Bill Data API: Request received');

  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tableSessionId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json', 'thermal', 'html'

    if (!tableSessionId) {
      return NextResponse.json({ 
        error: "Missing table session ID" 
      }, { status: 400 });
    }

    // Validate table session ID format
    if (!BillDataService.isValidTableSessionId(tableSessionId)) {
      return NextResponse.json({ 
        error: "Invalid table session ID format" 
      }, { status: 400 });
    }

    console.log('📄 Get Bill Data: Fetching bill data for table session', tableSessionId);

    // Get bill data
    let billData;
    try {
      billData = await BillDataService.getBillData(tableSessionId);
    } catch (error) {
      console.error('❌ Get Bill Data: Error fetching bill data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ 
        error: `Failed to fetch bill data: ${errorMessage}` 
      }, { status: 404 });
    }

    // Convert bill data to receipt format
    const receiptData = BillDataService.convertBillToReceiptData(billData);

    console.log('✅ Get Bill Data: Bill data prepared successfully', {
      tableSessionId: billData.tableSessionId,
      tableNumber: billData.tableNumber,
      itemCount: billData.items.length,
      total: billData.total,
      format
    });

    // Return data in requested format
    switch (format) {
      case 'thermal':
        // Generate thermal receipt format
        const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
        const thermalText = Array.from(escposData).map(byte => String.fromCharCode(byte)).join('');
        return new NextResponse(thermalText, {
          headers: { 
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="bill-${tableSessionId}.txt"`
          }
        });

      case 'html':
        // Generate simple HTML bill format
        const htmlContent = generateHTMLBill(receiptData);
        return new NextResponse(htmlContent, {
          headers: { 'Content-Type': 'text/html' }
        });

      default:
        // Return JSON format
        return NextResponse.json({
          success: true,
          billData: receiptData,
          summary: BillDataService.getBillSummary(billData),
          meta: {
            tableSessionId: billData.tableSessionId,
            tableNumber: billData.tableNumber,
            generatedAt: new Date().toISOString(),
            format: 'json'
          }
        });
    }

  } catch (error) {
    console.error('❌ Get Bill Data API: Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false,
      error: `Failed to get bill data: ${errorMessage}` 
    }, { status: 500 });
  }
}

/**
 * Generate simple HTML bill format
 */
function generateHTMLBill(receiptData: any): string {
  const formatAmount = (amount: number) => `฿${amount.toFixed(2)}`;
  const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bill - ${receiptData.tableNumber || 'Table'}</title>
    <style>
        body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .company-name { font-size: 18px; font-weight: bold; }
        .bill-type { font-size: 16px; font-weight: bold; margin: 10px 0; }
        .separator { border-top: 1px dashed #000; margin: 10px 0; }
        .item-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .totals { margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .amount-due { font-weight: bold; font-size: 16px; }
        .payment-options { margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        ul { list-style-type: disc; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">LENGOLF CO. LTD.</div>
        <div>540 Mercury Tower, Unit 407</div>
        <div>Bangkok 10330</div>
        <div>TAX ID: 0105566207013</div>
    </div>
    
    <div class="separator"></div>
    
    <div class="bill-type">BILL</div>
    
    ${receiptData.staffName ? `<div>Staff: ${receiptData.staffName}</div>` : ''}
    ${receiptData.tableNumber ? `<div>Table: ${receiptData.tableNumber}</div>` : ''}
    <div>Guests: ${receiptData.paxCount || 1}</div>
    <div>Date: ${transactionDate.toLocaleDateString()} ${transactionDate.toLocaleTimeString()}</div>
    
    <div class="separator"></div>
    
    <div>
        ${receiptData.items.map((item: any) => {
            const originalTotal = (item.originalPrice || item.price) * item.qty;
            return `
            <div class="item-row">
                <span>${item.qty}x ${item.name}</span>
                <span>${formatAmount(originalTotal)}</span>
            </div>
            ${item.itemDiscount && item.itemDiscountAmount > 0 ? `
                <div class="item-row" style="margin-left: 20px;">
                    <span style="color: #666;">${item.itemDiscount.title}</span>
                    <span style="color: #666;">-${formatAmount(item.itemDiscountAmount)}</span>
                </div>
            ` : ''}
            ${item.notes ? `<div style="font-size: 12px; margin-left: 20px;">Note: ${item.notes}</div>` : ''}
        `;
        }).join('')}
    </div>
    
    <div class="separator"></div>
    
    <div class="totals">
        ${receiptData.receiptDiscount && receiptData.receiptDiscountAmount > 0 ? `
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatAmount(receiptData.orderItemsTotal || receiptData.subtotal + receiptData.receiptDiscountAmount)}</span>
        </div>
        <div class="total-row">
            <span>Discount ${receiptData.receiptDiscount.type === 'percentage' ? '(' + receiptData.receiptDiscount.value + '%)' : ''}:</span>
            <span>-${formatAmount(receiptData.orderItemsTotal ? (receiptData.orderItemsTotal * receiptData.receiptDiscount.value / 100) : receiptData.receiptDiscountAmount)}</span>
        </div>
        <div class="total-row">
            <span>VAT (7%) incl.:</span>
            <span>${formatAmount(receiptData.tax)}</span>
        </div>
        ` : `
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatAmount(receiptData.subtotal)}</span>
        </div>
        <div class="total-row">
            <span>VAT (7%):</span>
            <span>${formatAmount(receiptData.tax)}</span>
        </div>
        `}
        <div class="separator"></div>
        <div class="total-row amount-due">
            <span>AMOUNT DUE:</span>
            <span>${formatAmount(receiptData.total)}</span>
        </div>
    </div>
    
    <div class="separator"></div>
    
    <div class="payment-options">
        <div><strong>PAYMENT OPTIONS AVAILABLE:</strong></div>
        <ul>
            <li>Cash</li>
            <li>PromptPay (QR Code)</li>
            <li>Visa/Mastercard (EDC)</li>
            <li>Alipay</li>
        </ul>
    </div>
    
    <div class="separator"></div>
    
    <div class="footer">
        <div>Please present this bill when paying</div>
        <div>Staff will process your payment and provide a receipt</div>
        <div style="margin-top: 10px;">www.len.golf</div>
        <div>Generated: ${transactionDate.toLocaleString()}</div>
    </div>
</body>
</html>`;
}