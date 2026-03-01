import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { extractMultiInvoiceData, resolveModel } from '@/lib/invoice-extraction-service';
import { uploadReceiptToDrive } from '@/lib/google-drive-service';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from '@/types/vendor-receipts';

export const maxDuration = 60; // LLM extraction + Google Drive upload + DB insert

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const staffName = formData.get('staff_name') as string | null;
    const vendorIdOverride = formData.get('vendor_id') as string | null;
    const receiptDateOverride = formData.get('receipt_date') as string | null;
    const notes = formData.get('notes') as string | null;
    const requestedModel = formData.get('model') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!staffName) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type as typeof ALLOWED_RECEIPT_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_RECEIPT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Step 1: Extract invoice data via LLM (multi-invoice aware)
    const { extraction, model_used } = await extractMultiInvoiceData(
      buffer,
      file.type || 'application/pdf',
      file.name,
      { model: resolveModel(requestedModel || undefined) }
    );

    if (!extraction.invoices || extraction.invoices.length === 0) {
      return NextResponse.json({
        error: 'No invoices could be extracted from this document. Please try again or enter data manually.',
        extraction,
        model_used,
      }, { status: 422 });
    }

    // Step 2: Resolve vendor (shared across all invoices)
    let vendorId = vendorIdOverride;
    let vendorName: string | null = null;

    if (vendorId) {
      const { data: v } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, company_name, address, tax_id, is_company')
        .eq('id', vendorId)
        .maybeSingle();

      if (v) {
        vendorName = v.name;
        if (extraction.vendor_name || extraction.vendor_address || extraction.vendor_tax_id) {
          const updates = computeVendorUpdates(v, {
            name: v.name,
            company_name: extraction.vendor_company_name_en,
            address: extraction.vendor_address,
            tax_id: extraction.vendor_tax_id,
          });
          if (updates) {
            await refacSupabaseAdmin
              .schema('backoffice')
              .from('vendors')
              .update(updates)
              .eq('id', v.id);
            console.log('[extract-and-upload] Updated vendor fields:', JSON.stringify(updates));
          }
        }
      }
    } else if (extraction.vendor_name) {
      const { data: existing } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, company_name, address, tax_id, is_company')
        .eq('name', extraction.vendor_name)
        .maybeSingle();

      if (existing) {
        vendorId = existing.id;
        vendorName = existing.name;
        const updates = computeVendorUpdates(existing, {
          name: existing.name,
          company_name: extraction.vendor_company_name_en,
          address: extraction.vendor_address,
          tax_id: extraction.vendor_tax_id,
        });
        if (updates) {
          await refacSupabaseAdmin
            .schema('backoffice')
            .from('vendors')
            .update(updates)
            .eq('id', existing.id);
        }
      } else {
        const { data: newVendor, error: insertErr } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendors')
          .insert({
            name: extraction.vendor_name,
            company_name: extraction.vendor_company_name_en || null,
            address: extraction.vendor_address || null,
            tax_id: extraction.vendor_tax_id || null,
          })
          .select()
          .single();

        if (!insertErr && newVendor) {
          vendorId = newVendor.id;
          vendorName = newVendor.name;
          console.log('[extract-and-upload] Created new vendor:', newVendor.name);
        }
      }
    }

    if (!vendorId) {
      return NextResponse.json({
        error: 'Could not determine vendor. Please select a vendor manually.',
        extraction,
        model_used,
      }, { status: 422 });
    }

    // Step 3: Upload to Google Drive once (shared file for all invoices)
    const firstInvoice = extraction.invoices[0];
    const receiptDate = receiptDateOverride || firstInvoice?.invoice_date || new Date().toISOString().split('T')[0];
    const parsedDate = new Date(receiptDate);
    const uploadResult = await uploadReceiptToDrive(buffer, file.name, file.type, parsedDate);

    // Step 4: Create one vendor_receipts record per invoice
    const now = new Date().toISOString();
    const receiptRows = extraction.invoices.map((inv) => ({
      vendor_id: vendorId!,
      receipt_date: inv.invoice_date || receiptDate,
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: uploadResult.fileName,
      submitted_by: staffName,
      notes: notes || inv.notes || null,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      total_amount: inv.total_amount,
      tax_base: inv.tax_base,
      vat_amount: inv.vat_amount,
      vat_type: inv.vat_type || 'none',
      wht_applicable: inv.wht_applicable || false,
      extraction_confidence: extraction.confidence,
      confidence_explanation: extraction.confidence_explanation,
      extracted_vendor_name: extraction.vendor_name,
      extracted_company_name_en: extraction.vendor_company_name_en,
      extracted_address: extraction.vendor_address,
      extracted_tax_id: extraction.vendor_tax_id,
      extraction_model: model_used,
      extracted_at: now,
      extraction_notes: inv.notes,
    }));

    const { data: receipts, error: dbErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .insert(receiptRows)
      .select();

    if (dbErr) {
      console.error('[extract-and-upload] DB insert error:', dbErr);
      return NextResponse.json({ error: 'Failed to save receipt records' }, { status: 500 });
    }

    console.log(`[extract-and-upload] Created ${receipts?.length || 0} receipt record(s) for ${extraction.invoices.length} invoice(s)`);

    // Return backwards-compatible response: `receipt` is the first record,
    // `receipts` is the full array, `invoices_detected` indicates count.
    return NextResponse.json({
      receipt: receipts?.[0] || null,
      receipts: receipts || [],
      extraction,
      model_used,
      vendor_id: vendorId,
      vendor_name: vendorName,
      invoices_detected: extraction.invoices.length,
    }, { status: 201 });
  } catch (error) {
    console.error('[extract-and-upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
