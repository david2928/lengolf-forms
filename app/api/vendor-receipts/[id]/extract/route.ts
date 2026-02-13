import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { extractInvoiceData, resolveModel } from '@/lib/invoice-extraction-service';
import { downloadFileFromDrive } from '@/lib/google-drive-service';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';

export const maxDuration = 30; // Drive download + LLM vision extraction

/**
 * Background extraction endpoint.
 * Called fire-and-forget after a fast upload completes.
 * Downloads the file from Drive, runs LLM extraction, updates the receipt record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const requestedModel = body.model as string | undefined;

    // Fetch the receipt
    const { data: receipt, error: rErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('id, file_id, file_name, vendor_id, receipt_date')
      .eq('id', id)
      .single();

    if (rErr || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (!receipt.file_id) {
      return NextResponse.json({ error: 'No file_id on receipt' }, { status: 400 });
    }

    // Download file from Drive
    const { buffer, mimeType } = await downloadFileFromDrive(receipt.file_id);

    // Run LLM extraction
    const { extraction, model_used } = await extractInvoiceData(
      buffer,
      mimeType,
      receipt.file_name || 'receipt',
      { model: resolveModel(requestedModel) }
    );

    // Update receipt with extraction data
    const { error: updateErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .update({
        invoice_number: extraction.invoice_number,
        invoice_date: extraction.invoice_date,
        total_amount: extraction.total_amount,
        tax_base: extraction.tax_base,
        vat_amount: extraction.vat_amount,
        vat_type: extraction.vat_type || 'none',
        wht_applicable: extraction.wht_applicable || false,
        extraction_confidence: extraction.confidence,
        confidence_explanation: extraction.confidence_explanation,
        extracted_vendor_name: extraction.vendor_name,
        extracted_company_name_en: extraction.vendor_company_name_en,
        extracted_address: extraction.vendor_address,
        extracted_tax_id: extraction.vendor_tax_id,
        extraction_model: model_used,
        extracted_at: new Date().toISOString(),
        extraction_notes: extraction.notes,
      })
      .eq('id', id);

    if (updateErr) {
      console.error('[extract] DB update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
    }

    // Smart vendor upsert from extracted data
    if (receipt.vendor_id && (extraction.vendor_company_name_en || extraction.vendor_address || extraction.vendor_tax_id)) {
      const { data: vendor } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, company_name, address, tax_id, is_company')
        .eq('id', receipt.vendor_id)
        .single();

      if (vendor) {
        const updates = computeVendorUpdates(vendor, {
          name: vendor.name,
          company_name: extraction.vendor_company_name_en,
          address: extraction.vendor_address,
          tax_id: extraction.vendor_tax_id,
        });
        if (updates) {
          await refacSupabaseAdmin
            .schema('backoffice')
            .from('vendors')
            .update(updates)
            .eq('id', vendor.id);
          console.log('[extract] Updated vendor fields:', JSON.stringify(updates));
        }
      }
    }

    console.log('[extract] Extraction complete for receipt', id, '- confidence:', extraction.confidence);

    return NextResponse.json({
      extraction,
      model_used,
    });
  } catch (error) {
    console.error('[extract] Error:', error);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
