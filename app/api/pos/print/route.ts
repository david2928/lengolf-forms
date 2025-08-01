import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

// Unified Print API - Single endpoint for all printing operations
// Routes to appropriate existing endpoints based on print type

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      type, 
      id, 
      options = {} 
    } = body as {
      type: 'TAX_INV_ABB' | 'TAX_INV_RECEIPT' | 'BILL';
      id: string;
      options?: {
        method?: 'auto' | 'usb' | 'bluetooth';
        format?: 'thermal' | 'html';
        language?: 'en' | 'th';
      };
    };

    // Validate required fields
    if (!type || !id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type and id are required'
      }, { status: 400 });
    }

    // Validate print type
    const validTypes = ['TAX_INV_ABB', 'TAX_INV_RECEIPT', 'BILL'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid print type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    console.log('🖨️ Unified Print API: Request received', { type, id, options });

    // Determine target endpoint and request body based on print type
    let targetEndpoint: string;
    let requestBody: any;
    const { method = 'auto' } = options;

    switch (type) {
      case 'TAX_INV_ABB':
        // After payment - regular receipt (tax invoice ABB format)
        targetEndpoint = '/api/pos/print-bluetooth';
        requestBody = { receiptNumber: id };
        break;

      case 'TAX_INV_RECEIPT':
        // Transaction management - tax invoice receipt format
        targetEndpoint = '/api/pos/print-tax-invoice-bluetooth';
        requestBody = { receiptNumber: id, isTaxInvoice: true };
        break;

      case 'BILL':
        // Before payment - bill/check
        // Choose endpoint based on preferred method (USB is faster for bills)
        const preferUSBForBills = method === 'auto' || method === 'usb';
        targetEndpoint = preferUSBForBills 
          ? '/api/pos/print-bill-usb' 
          : '/api/pos/print-bill-bluetooth';
        requestBody = { tableSessionId: id };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported print type: ${type}`
        }, { status: 400 });
    }

    console.log(`📡 Routing to: ${targetEndpoint}`, requestBody);

    // Make internal API call to existing endpoint
    const baseUrl = request.url.split('/api/')[0];
    const fullUrl = `${baseUrl}${targetEndpoint}`;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authentication headers
        'Cookie': request.headers.get('cookie') || '',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    // Enhance response with unified format
    const unifiedResponse = {
      success: result.success || false,
      message: result.message || (result.success ? 'Print data prepared successfully' : 'Print preparation failed'),
      printType: type,
      identifier: id,
      method: method.toUpperCase(),
      targetEndpoint,
      // Include original response data
      data: result.receiptData || result.billData || result.data || result,
      // Additional metadata
      summary: result.summary,
      escposData: result.escposData,
      error: result.error
    };

    console.log(`✅ Unified Print API: ${result.success ? 'Success' : 'Failed'}`, {
      printType: type,
      identifier: id,
      targetEndpoint,
      success: result.success
    });

    return NextResponse.json(unifiedResponse, { 
      status: result.success ? 200 : (response.status || 500) 
    });

  } catch (error) {
    console.error('❌ Unified Print API: Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      printType: null,
      identifier: null,
      method: 'UNKNOWN'
    }, { status: 500 });
  }
}