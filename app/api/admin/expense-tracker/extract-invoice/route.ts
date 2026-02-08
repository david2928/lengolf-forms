import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { extractInvoiceData, resolveModel } from '@/lib/invoice-extraction-service';
import { uploadExpenseDocument } from '@/lib/google-drive-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedModel = (formData.get('model') as string) || undefined;
    // Optional context for Drive upload (passed from row)
    const paymentDate = formData.get('payment_date') as string | null;
    const vendorNameHint = formData.get('vendor_name') as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only PDF and image files are supported" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use shared extraction service
    const { extraction, model_used } = await extractInvoiceData(
      buffer,
      file.type || 'application/pdf',
      file.name,
      { model: resolveModel(requestedModel) }
    );

    // Upload to Google Drive if we have enough context
    let document_url: string | null = null;
    const resolvedVendor = extraction.vendor_name || vendorNameHint;
    const resolvedDate = paymentDate || extraction.invoice_date;

    if (resolvedVendor && resolvedDate) {
      try {
        const docType = (extraction.wht_applicable && extraction.vat_type === 'none')
          ? 'wht' as const
          : 'vat' as const;

        const result = await uploadExpenseDocument(buffer, file.type || 'application/pdf', {
          paymentDate: resolvedDate,
          vendorName: resolvedVendor,
          documentType: docType,
          originalFileName: file.name,
        });

        document_url = result.fileUrl;
        console.log('[extract-invoice] Uploaded to Drive:', result.fileName, '→', docType, 'folder');
      } catch (driveErr) {
        console.error('[extract-invoice] Drive upload failed (non-fatal):', driveErr);
      }
    }

    return NextResponse.json({ extraction, model_used, document_url });
  } catch (error) {
    console.error('Invoice extraction error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
