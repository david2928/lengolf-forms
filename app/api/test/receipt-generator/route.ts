import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { receiptGenerator } from '@/services/ReceiptGenerator';
import { ReceiptData, PaymentMethod } from '@/types/payment';

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
      transactionId: `test-${Date.now()}`,
      receiptNumber: testData.receiptNumber,
      businessInfo: {
        name: "Lengolf Golf Club",
        address: "123 Golf Course Road, Bangkok 10120",
        taxId: "1234567890123",
        phone: "02-123-4567"
      },
      transaction: {
        date: new Date(),
        tableNumber: testData.tableNumber,
        staffName: testData.staffName,
        customerName: testData.customerName,
        items: testData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes
        })),
        subtotal: testData.subtotal,
        vatAmount: testData.vatAmount,
        totalAmount: testData.totalAmount,
        paymentMethods: testData.paymentMethods
      },
      footer: {
        thankYouMessage: "Thank you for dining with us!",
        returnPolicy: "Returns accepted within 24 hours with receipt."
      }
    };

    console.log('✅ Test Receipt Generator: Receipt data prepared');

    // Return different formats based on request
    switch (format) {
      case 'html':
        const htmlContent = receiptGenerator.generateHTMLReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="test-receipt-${testData.receiptNumber}.html"`
          }
        });

      case 'thermal':
        const thermalContent = width === '80mm' 
          ? receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en')
          : receiptGenerator.generateThermalReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(thermalContent, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="test-receipt-${width}-${testData.receiptNumber}.txt"`
          }
        });

      case 'thermal80':
        const thermal80Content = receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en');
        return new NextResponse(thermal80Content, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="test-receipt-80mm-${testData.receiptNumber}.txt"`
          }
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          receipt: receiptData,
          summary: receiptGenerator.generateReceiptSummary(receiptData),
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