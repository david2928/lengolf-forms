import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { ReceiptDataService } from '@/lib/receipt-data-service';
import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

// Simple HTML receipt generator for this endpoint
function generateHTMLReceipt(receiptData: ReceiptData): string {
  const receiptType = receiptData.isTaxInvoice ? 'TAX INVOICE (ABB)' : 'RECEIPT';
  const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${receiptType} - ${receiptData.receiptNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
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
    <p>May your next round be under par!</p>
    <p>www.len.golf</p>
    <p><small>Generated: ${new Date().toLocaleString('th-TH')}<br>
    Powered by Lengolf POS System</small></p>
  </div>
</body>
</html>
  `.trim();
}

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const receiptNumber = searchParams.get('receiptNumber');
    const format = searchParams.get('format') || 'json'; // json, html, thermal
    const language = searchParams.get('language') || 'en'; // en, th
    const isTaxInvoice = searchParams.get('taxInvoice') === 'true';

    if (!receiptNumber || !ReceiptDataService.isValidReceiptNumber(receiptNumber)) {
      return NextResponse.json({
        error: 'Valid receipt number is required'
      }, { status: 400 });
    }

    console.log('🔍 Receipt API: Looking for receipt:', receiptNumber, { format, isTaxInvoice });

    // Get receipt data using shared service
    const receiptData = isTaxInvoice 
      ? await ReceiptDataService.getTaxInvoiceData(receiptNumber)
      : await ReceiptDataService.getReceiptData(receiptNumber);

    const summary = ReceiptDataService.getReceiptSummary(receiptData);
    console.log('✅ Receipt API: Receipt data prepared:', summary);

    // Return different formats based on request
    switch (format) {
      case 'html':
        // Generate simple HTML receipt
        const htmlContent = generateHTMLReceipt(receiptData);
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="receipt-${receiptData.receiptNumber}.html"`
          }
        });

      case 'thermal':
        // Generate ESC/POS thermal receipt
        const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
        const thermalText = Array.from(escposData)
          .map(byte => String.fromCharCode(byte))
          .join('');
        return new NextResponse(thermalText, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="receipt-thermal-${receiptData.receiptNumber}.txt"`
          }
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          receiptData: receiptData,
          summary: summary,
          format: format,
          isTaxInvoice: receiptData.isTaxInvoice || false
        });
    }

  } catch (error) {
    console.error('❌ Receipt API: Error generating receipt:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, receiptNumber, format = 'html', language = 'en', taxInvoice = false } = await request.json();

    if (action === 'regenerate') {
      // Regenerate receipt for existing transaction
      if (!receiptNumber) {
        return NextResponse.json({
          error: 'Receipt number is required'
        }, { status: 400 });
      }

      // This would use the same logic as GET but allow for different parameters
      // For now, redirect to GET endpoint
      const queryParams = new URLSearchParams({
        receiptNumber,
        format,
        language,
        ...(taxInvoice && { taxInvoice: 'true' })
      });

      return NextResponse.redirect(`/api/pos/receipts?${queryParams}`);
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Receipt API: Error processing receipt request:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}