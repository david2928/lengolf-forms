import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/** Search vendor receipts near a given date, optionally filtered by vendor */
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const vendorId = searchParams.get('vendor_id');
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date param required (YYYY-MM-DD)" }, { status: 400 });
    }

    // Calculate date range
    const center = new Date(date);
    const from = new Date(center);
    from.setDate(from.getDate() - days);
    const to = new Date(center);
    to.setDate(to.getDate() + days);

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('id, vendor_id, receipt_date, invoice_number, invoice_date, total_amount, tax_base, vat_amount, vat_type, wht_applicable, file_url, notes, extraction_notes, extracted_vendor_name')
      .gte('receipt_date', fromStr)
      .lte('receipt_date', toStr)
      .order('receipt_date', { ascending: false })
      .limit(30);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: receipts, error } = await query;

    if (error) {
      console.error('Receipt search error:', error);
      return NextResponse.json({ error: "Failed to search receipts" }, { status: 500 });
    }

    // Fetch vendor names for display
    const vendorIdSet: Record<string, boolean> = {};
    (receipts || []).forEach((r: { vendor_id: string | null }) => {
      if (r.vendor_id) vendorIdSet[r.vendor_id] = true;
    });
    const vendorIds = Object.keys(vendorIdSet);
    let vendorMap: Record<string, string> = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds);
      if (vendors) {
        vendors.forEach((v: { id: string; name: string }) => { vendorMap[v.id] = v.name; });
      }
    }

    const results = (receipts || []).map((r: Record<string, unknown>) => ({
      ...r,
      vendor_name: r.vendor_id ? vendorMap[r.vendor_id as string] || r.extracted_vendor_name || null : r.extracted_vendor_name || null,
    }));

    return NextResponse.json({ receipts: results });
  } catch (error) {
    console.error('Receipt search error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
