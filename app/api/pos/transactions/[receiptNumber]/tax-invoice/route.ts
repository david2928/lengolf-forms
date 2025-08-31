import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

interface TaxInvoiceData {
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  isCompany: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params;
  
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taxInvoiceData: TaxInvoiceData = await request.json();

    // Validate required fields
    if (!taxInvoiceData.customerName || !taxInvoiceData.customerTaxId) {
      return NextResponse.json({ 
        error: "Customer name and tax ID are required" 
      }, { status: 400 });
    }

    // Generate tax invoice number (replace R with TI)
    const taxInvoiceNumber = receiptNumber.replace(/^R/, 'TI');

    // Update the transaction with tax invoice information
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .update({
        tax_invoice_number: taxInvoiceNumber,
        tax_invoice_issued: true,
        tax_invoice_date: new Date().toISOString(),
        customer_tax_info: {
          name: taxInvoiceData.customerName,
          address: taxInvoiceData.customerAddress,
          taxId: taxInvoiceData.customerTaxId,
          isCompany: taxInvoiceData.isCompany
        }
      })
      .eq('receipt_number', receiptNumber)
      .select()
      .single();

    if (error) {
      console.error('Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: "Failed to update transaction with tax invoice info",
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: "Transaction not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      taxInvoiceNumber,
      message: "Tax invoice generated successfully"
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}