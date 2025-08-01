import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';
import { PaymentMethod } from '@/types/payment';

// Simple HTML test receipt generator
function generateTestHTMLReceipt(receiptData: ReceiptData): string {
  const receiptType = receiptData.isTaxInvoice ? 'TAX INVOICE (ABB)' : 'TEST RECEIPT';
  const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>TEST - ${receiptType} - ${receiptData.receiptNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .test-notice { background: #e3f2fd; text-align: center; padding: 10px; margin-bottom: 20px; font-weight: bold; border: 2px dashed #2196f3; }
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
  <div class="test-notice">🧪 TEST RECEIPT - FOR DEVELOPMENT TESTING ONLY 🧪</div>
  
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
    ${receiptData.customerName ? `<strong>Customer:</strong> ${receiptData.customerName}<br>` : ''}
    ${receiptData.tableNumber ? `<strong>Table:</strong> ${receiptData.tableNumber}<br>` : ''}
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
    <p>🧪 This is a test receipt for development purposes only!</p>
    <p>www.len.golf</p>
    <p><small>Test Generated: ${new Date().toLocaleString('th-TH')}<br>
    Powered by Lengolf POS System</small></p>
  </div>
</body>
</html>
  `.trim();
}

interface TestReceiptData {
  receiptNumber: string;
  tableNumber: string;
  customerName: string;
  staffName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethods: Array<{
    method: PaymentMethod;
    amount: number;
  }>;
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { testData, format = 'json', language = 'en', width = '58mm' } = body as {
      testData: TestReceiptData;
      format: 'json' | 'html' | 'thermal' | 'thermal80';
      language: 'en' | 'th';
      width?: '58mm' | '80mm';
    };

    if (!testData) {
      return NextResponse.json({
        error: 'Test data is required'
      }, { status: 400 });
    }

    console.log('🧪 Test Receipt Generator: Generating test receipt', {
      format,
      language,
      receiptNumber: testData.receiptNumber
    });

    // Convert test data to ReceiptData format
    const receiptData: ReceiptData = {
      receiptNumber: testData.receiptNumber,
      transactionDate: new Date().toISOString(),
      staffName: testData.staffName,
      customerName: testData.customerName,
      tableNumber: testData.tableNumber,
      paxCount: 1,
      items: testData.items.map(item => ({
        name: item.name,
        qty: item.quantity,
        price: item.unitPrice,
        notes: item.notes
      })),
      subtotal: testData.subtotal,
      tax: testData.vatAmount,
      total: testData.totalAmount,
      paymentMethods: testData.paymentMethods.map(pm => ({
        method: pm.method,
        amount: pm.amount
      })),
      isTaxInvoice: false
    };

    console.log('✅ Test Receipt Generator: Receipt data prepared');

    // Return different formats based on request
    switch (format) {
      case 'html':
        // Simple HTML test receipt
        const htmlContent = generateTestHTMLReceipt(receiptData);
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="test-receipt-${testData.receiptNumber}.html"`
          }
        });

      case 'thermal':
        // Generate ESC/POS thermal test receipt
        const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
        const thermalText = Array.from(escposData)
          .map(byte => String.fromCharCode(byte))
          .join('');
        return new NextResponse(thermalText, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="test-receipt-thermal-${testData.receiptNumber}.txt"`
          }
        });

      case 'thermal80':
        // Legacy support - map to thermal
        const escpos80Data = ReceiptFormatter.generateESCPOSData(receiptData);
        const thermal80Text = Array.from(escpos80Data)
          .map(byte => String.fromCharCode(byte))
          .join('');
        return new NextResponse(thermal80Text, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="test-receipt-80mm-${testData.receiptNumber}.txt"`
          }
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          receiptData: receiptData,
          summary: {
            receiptNumber: receiptData.receiptNumber,
            totalAmount: receiptData.total,
            itemCount: receiptData.items.length,
            paymentMethods: receiptData.paymentMethods.map(p => p.method),
            date: new Date(receiptData.transactionDate || new Date()).toLocaleDateString()
          },
          testMetadata: {
            generated: new Date().toISOString(),
            format: format,
            language: language,
            purpose: 'testing'
          }
        });
    }

  } catch (error) {
    console.error('❌ Test Receipt Generator: Error generating test receipt:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}