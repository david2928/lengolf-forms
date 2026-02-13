import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { downloadFileFromDrive, uploadExpenseDocument } from '@/lib/google-drive-service';
import { computeVendorUpdates } from '@/lib/smart-vendor-upsert';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bank_transaction_id, vendor_receipt_id, apply_extraction } = body;

    if (!bank_transaction_id || !vendor_receipt_id) {
      return NextResponse.json({ error: "bank_transaction_id and vendor_receipt_id required" }, { status: 400 });
    }

    // Fetch the receipt
    const { data: receipt, error: rErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('*')
      .eq('id', vendor_receipt_id)
      .single();

    if (rErr || !receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Fetch the bank transaction
    const { data: tx, error: txErr } = await refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('id, transaction_date')
      .eq('id', bank_transaction_id)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Build the annotation update
    const annotationUpdate: Record<string, unknown> = {
      bank_transaction_id,
      vendor_receipt_id,
      updated_by: session.user.email,
    };

    if (apply_extraction) {
      // Get vendor name for Drive upload filename (prefer English names)
      let vendorName = receipt.extracted_company_name_en || receipt.extracted_vendor_name || 'Unknown';
      if (receipt.vendor_id) {
        const { data: vendor } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('vendors')
          .select('id, name, company_name, address, tax_id, is_company')
          .eq('id', receipt.vendor_id)
          .single();

        if (vendor) {
          vendorName = vendor.company_name || vendor.name;

          // Smart vendor upsert from extraction data
          if (receipt.extracted_vendor_name || receipt.extracted_address || receipt.extracted_tax_id) {
            const updates = computeVendorUpdates(vendor, {
              name: vendor.name,
              company_name: receipt.extracted_company_name_en,
              address: receipt.extracted_address,
              tax_id: receipt.extracted_tax_id,
            });
            if (updates) {
              await refacSupabaseAdmin
                .schema('backoffice')
                .from('vendors')
                .update(updates)
                .eq('id', vendor.id);
            }
          }
        }
      }

      // Copy file to expense document folder
      let documentUrl: string | null = null;
      if (receipt.file_id) {
        try {
          const { buffer, mimeType } = await downloadFileFromDrive(receipt.file_id);
          const docType = (receipt.wht_applicable && receipt.vat_type === 'none')
            ? 'wht' as const
            : 'vat' as const;

          const result = await uploadExpenseDocument(buffer, mimeType, {
            paymentDate: tx.transaction_date,
            vendorName,
            documentType: docType,
            originalFileName: receipt.file_name || undefined,
          });
          documentUrl = result.fileUrl;
          console.log('[link-receipt] Copied to expense folder:', result.fileName);
        } catch (driveErr) {
          console.error('[link-receipt] Drive copy failed (non-fatal):', driveErr);
        }
      }

      // Apply extraction data to annotation
      annotationUpdate.vendor_id = receipt.vendor_id;
      if (receipt.vat_type && receipt.vat_type !== 'none') {
        annotationUpdate.vat_type = receipt.vat_type;
      }
      if (receipt.vat_amount != null) {
        annotationUpdate.vat_amount = receipt.vat_amount;
        annotationUpdate.vat_amount_override = true;
      }
      if (receipt.tax_base != null) {
        annotationUpdate.tax_base = receipt.tax_base;
        annotationUpdate.tax_base_override = true;
      }
      if (receipt.invoice_number) {
        annotationUpdate.invoice_ref = receipt.invoice_number;
      }
      if (receipt.wht_applicable) {
        // Determine WHT type based on vendor
        let whtType = 'pnd3';
        if (receipt.vendor_id) {
          const { data: v } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('vendors')
            .select('is_company')
            .eq('id', receipt.vendor_id)
            .maybeSingle();
          if (v?.is_company) whtType = 'pnd53';
        }
        annotationUpdate.wht_type = whtType;
      }
      if (documentUrl) {
        annotationUpdate.document_url = documentUrl;
      }
      if (receipt.extraction_notes) {
        annotationUpdate.notes = receipt.extraction_notes;
      }
      // Set reporting month from receipt date or transaction date
      const month = (receipt.receipt_date || tx.transaction_date).substring(0, 7);
      annotationUpdate.vat_reporting_month = month;
      annotationUpdate.wht_reporting_month = month;
    }

    // Upsert annotation
    const { data: existing } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .select('id')
      .eq('bank_transaction_id', bank_transaction_id)
      .maybeSingle();

    if (!existing) {
      annotationUpdate.created_by = session.user.email;
    }

    const { data: annotation, error: annErr } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .upsert(annotationUpdate, { onConflict: 'bank_transaction_id' })
      .select()
      .single();

    if (annErr) {
      console.error('[link-receipt] Annotation upsert error:', annErr);
      return NextResponse.json({ error: "Failed to link receipt" }, { status: 500 });
    }

    return NextResponse.json({ annotation });
  } catch (error) {
    console.error('[link-receipt] Error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bank_transaction_id } = body;

    if (!bank_transaction_id) {
      return NextResponse.json({ error: "bank_transaction_id required" }, { status: 400 });
    }

    const { error } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .update({
        vendor_receipt_id: null,
        updated_by: session.user.email,
      })
      .eq('bank_transaction_id', bank_transaction_id);

    if (error) {
      console.error('[link-receipt] Unlink error:', error);
      return NextResponse.json({ error: "Failed to unlink receipt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[link-receipt] Error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
