import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { extractMultiInvoiceData, resolveModel } from '@/lib/invoice-extraction-service';
import { downloadFileFromDrive } from '@/lib/google-drive-service';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';

export const maxDuration = 60; // Drive download + LLM multi-invoice extraction

/**
 * Background extraction endpoint.
 * Called fire-and-forget after a fast upload completes.
 * Downloads the file from Drive, runs LLM extraction, updates the receipt record.
 * If multiple invoices are detected, updates the existing record with the first
 * invoice and creates additional records for the rest.
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
      .select('id, file_id, file_name, file_url, vendor_id, receipt_date, submitted_by')
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

    // Run multi-invoice LLM extraction
    const { extraction, model_used } = await extractMultiInvoiceData(
      buffer,
      mimeType,
      receipt.file_name || 'receipt',
      { model: resolveModel(requestedModel) }
    );

    if (!extraction.invoices || extraction.invoices.length === 0) {
      return NextResponse.json({
        error: 'No invoices detected in document',
        extraction,
        model_used,
        invoices_detected: 0,
      }, { status: 422 });
    }

    const now = new Date().toISOString();
    const sharedFields = {
      extraction_confidence: extraction.confidence,
      confidence_explanation: extraction.confidence_explanation,
      extracted_vendor_name: extraction.vendor_name,
      extracted_company_name_en: extraction.vendor_company_name_en,
      extracted_address: extraction.vendor_address,
      extracted_tax_id: extraction.vendor_tax_id,
      extraction_model: model_used,
      extracted_at: now,
    };

    const firstInvoice = extraction.invoices[0];

    // Update existing receipt with the first invoice
    if (firstInvoice) {
      const { error: updateErr } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendor_receipts')
        .update({
          invoice_number: firstInvoice.invoice_number,
          invoice_date: firstInvoice.invoice_date,
          total_amount: firstInvoice.total_amount,
          tax_base: firstInvoice.tax_base,
          vat_amount: firstInvoice.vat_amount,
          vat_type: firstInvoice.vat_type || 'none',
          wht_applicable: firstInvoice.wht_applicable || false,
          extraction_notes: firstInvoice.notes,
          ...sharedFields,
        })
        .eq('id', id);

      if (updateErr) {
        console.error('[extract] DB update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
      }
    }

    // Create additional records for remaining invoices (if multi-invoice)
    const additionalInvoices = extraction.invoices.slice(1);
    let additionalReceipts: unknown[] = [];

    if (additionalInvoices.length > 0) {
      // Clean up any sibling records from previous extractions of this same file
      if (receipt.file_id) {
        const { error: cleanupErr } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendor_receipts')
          .delete()
          .eq('file_id', receipt.file_id)
          .neq('id', id);

        if (cleanupErr) {
          console.error('[extract] Failed to clean up old sibling records:', cleanupErr);
        }
      }

      const newRows = additionalInvoices.map((inv) => ({
        vendor_id: receipt.vendor_id,
        receipt_date: inv.invoice_date || receipt.receipt_date,
        file_url: receipt.file_url,
        file_id: receipt.file_id,
        file_name: receipt.file_name,
        submitted_by: receipt.submitted_by,
        notes: inv.notes,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        total_amount: inv.total_amount,
        tax_base: inv.tax_base,
        vat_amount: inv.vat_amount,
        vat_type: inv.vat_type || 'none',
        wht_applicable: inv.wht_applicable || false,
        extraction_notes: inv.notes,
        ...sharedFields,
      }));

      const { data: newReceipts, error: insertErr } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendor_receipts')
        .insert(newRows)
        .select();

      if (insertErr) {
        console.error('[extract] DB insert error for additional invoices:', insertErr);
      } else {
        additionalReceipts = newReceipts || [];
      }
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

    console.log(`[extract] Extraction complete for receipt ${id} - ${extraction.invoices.length} invoice(s), confidence: ${extraction.confidence}`);

    return NextResponse.json({
      extraction,
      model_used,
      invoices_detected: extraction.invoices.length,
      additional_receipts_created: additionalReceipts.length,
    });
  } catch (error) {
    console.error('[extract] Error:', error);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
