import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { extractInvoiceData, resolveModel } from '@/lib/invoice-extraction-service';
import { uploadReceiptToDrive } from '@/lib/google-drive-service';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from '@/types/vendor-receipts';

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

    // Step 1: Extract invoice data via LLM
    const { extraction, model_used } = await extractInvoiceData(
      buffer,
      file.type || 'application/pdf',
      file.name,
      { model: resolveModel(requestedModel || undefined) }
    );

    // Step 2: Resolve vendor
    let vendorId = vendorIdOverride;
    let vendorName: string | null = null;

    if (vendorId) {
      // Use override - fetch vendor name
      const { data: v } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, company_name, address, tax_id, is_company')
        .eq('id', vendorId)
        .maybeSingle();

      if (v) {
        vendorName = v.name;
        // Smart upsert vendor details from extraction
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
      // Search by extracted name
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
        // Create new vendor
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

    // Step 3: Upload to Google Drive (receipts folder)
    const receiptDate = receiptDateOverride || extraction.invoice_date || new Date().toISOString().split('T')[0];
    const parsedDate = new Date(receiptDate);
    const uploadResult = await uploadReceiptToDrive(buffer, file.name, file.type, parsedDate);

    // Step 4: Insert into vendor_receipts with extraction data
    const { data: receipt, error: dbErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .insert({
        vendor_id: vendorId,
        receipt_date: receiptDate,
        file_url: uploadResult.fileUrl,
        file_id: uploadResult.fileId,
        file_name: uploadResult.fileName,
        submitted_by: staffName,
        notes: notes || extraction.notes || null,
        // Extraction columns
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
      .select()
      .single();

    if (dbErr) {
      console.error('[extract-and-upload] DB insert error:', dbErr);
      return NextResponse.json({ error: 'Failed to save receipt record' }, { status: 500 });
    }

    return NextResponse.json({
      receipt,
      extraction,
      model_used,
      vendor_id: vendorId,
      vendor_name: vendorName,
    }, { status: 201 });
  } catch (error) {
    console.error('[extract-and-upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
