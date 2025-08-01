import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { ReceiptDataService } from '@/lib/receipt-data-service';
import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

// Simple HTML receipt generator for reprint endpoint
function generateHTMLReceipt(receiptData: ReceiptData): string {
  const receiptType = receiptData.isTaxInvoice ? 'TAX INVOICE (ABB)' : 'RECEIPT';
  const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>REPRINT - ${receiptType} - ${receiptData.receiptNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .reprint-notice { background: #ffeb3b; text-align: center; padding: 10px; margin-bottom: 20px; font-weight: bold; }
    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .receipt-type { font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 5px; }
    .details { margin: 20px 0; }
    .items { margin: 20px 0; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 20px; text-align: right; }
    .total-line { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 5px; }
    .footer { margin-top: 30px; text-align: center; font-style: italic; color: #666; }
  </style>
</head>
<body>
  <div class="reprint-notice">⚠️ REPRINT - NOT FOR OFFICIAL USE ⚠️</div>
  
  <div class="header">
    <div class="company-name">LENGOLF CO. LTD.</div>
    <div>540 Mercury Tower, 4th Floor, Unit 407</div>
    <div>Ploenchit Road, Lumpini, Pathumwan</div>
    <div>Bangkok 10330</div>
    <div>TAX ID: 0105566207013</div>
    <br>
    <div class="receipt-type">${receiptType}</div>
  </div>
  
  <div class="details">
    <strong>Receipt No:</strong> ${receiptData.receiptNumber}<br>
    <strong>Date:</strong> ${transactionDate.toLocaleDateString('en-GB')} ${transactionDate.toLocaleTimeString('en-GB', { hour12: false })}<br>
    ${receiptData.staffName ? `<strong>Staff:</strong> ${receiptData.staffName}<br>` : ''}
    <strong>Guests:</strong> ${receiptData.paxCount || 1}
  </div>
  
  <div class="items">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${receiptData.items.map(item => `
          <tr>
            <td>${item.name}${item.notes ? `<br><small><em>${item.notes}</em></small>` : ''}</td>
            <td>${item.qty}</td>
            <td>฿${item.price.toFixed(2)}</td>
            <td>฿${(item.price * item.qty).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="totals">
    <div>Subtotal: ฿${receiptData.subtotal.toFixed(2)}</div>
    <div>VAT (7%): ฿${receiptData.tax.toFixed(2)}</div>
    <div class="total-line">Total: ฿${receiptData.total.toFixed(2)}</div>
    
    <div style="margin-top: 20px;">
      <strong>Payment:</strong><br>
      ${receiptData.paymentMethods.map(payment => 
        `${payment.method}: ฿${payment.amount.toFixed(2)}`
      ).join('<br>')}
    </div>
  </div>
  
  <div class="footer">
    <p>You're tee-rific. Come back soon!</p>
    <p>Tel: 096-668-2335 | @lengolf</p>
    <p>www.len.golf</p>
    <p><small>REPRINT Generated: ${new Date().toLocaleString('th-TH')}<br>
    Powered by Lengolf POS System</small></p>
  </div>
</body>
</html>
  `.trim();
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      receiptNumber, 
      format = 'html',
      language = 'en',
      isTaxInvoice = false
    } = body as {
      receiptNumber?: string;
      format?: 'html' | 'thermal' | 'json';
      language?: 'en' | 'th';
      isTaxInvoice?: boolean;
    };

    if (!receiptNumber || !ReceiptDataService.isValidReceiptNumber(receiptNumber)) {
      return NextResponse.json({
        error: 'Valid receipt number is required'
      }, { status: 400 });
    }

    console.log('🔄 Reprint API: Looking up receipt:', receiptNumber, { format, isTaxInvoice });

    // Get receipt data using shared service
    const receiptData = isTaxInvoice 
      ? await ReceiptDataService.getTaxInvoiceData(receiptNumber)
      : await ReceiptDataService.getReceiptData(receiptNumber);

    const summary = ReceiptDataService.getReceiptSummary(receiptData);
    console.log('✅ Reprint API: Receipt data prepared for format:', format, summary);

    // Return appropriate format
    switch (format) {
      case 'html':
        // Generate HTML reprint with warning notice
        const htmlContent = generateHTMLReceipt(receiptData);
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="reprint-${receiptData.receiptNumber}.html"`
          }
        });

      case 'thermal':
        // Generate ESC/POS thermal reprint
        const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
        const thermalText = Array.from(escposData)
          .map(byte => String.fromCharCode(byte))
          .join('');
        return new NextResponse(thermalText, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="reprint-thermal-${receiptData.receiptNumber}.txt"`
          }
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          message: 'Receipt data prepared for reprint',
          receiptData: receiptData,
          summary: summary,
          format: format,
          isReprint: true,
          isTaxInvoice: receiptData.isTaxInvoice || false
        });
    }

  } catch (error) {
    console.error('❌ Reprint API: Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}