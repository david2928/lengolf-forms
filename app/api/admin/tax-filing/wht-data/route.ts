import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { WhtEntry, WhtFilingData, WhtFilingSummary } from '@/types/tax-filing';

const COMPANY_TAX_ID = '0105566207013';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');       // YYYY-MM
  const formType = searchParams.get('form_type');  // pnd3 or pnd53

  if (!period || !formType) {
    return NextResponse.json({ error: "Missing period or form_type parameter" }, { status: 400 });
  }

  if (formType !== 'pnd3' && formType !== 'pnd53') {
    return NextResponse.json({ error: "form_type must be 'pnd3' or 'pnd53'" }, { status: 400 });
  }

  // Validate period format
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "period must be in YYYY-MM format" }, { status: 400 });
  }

  try {
    // Query transaction annotations with bank transactions and vendors
    const { data: annotations, error: annotationsError } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .select(`
        id,
        bank_transaction_id,
        vendor_id,
        vendor_name_override,
        wht_type,
        wht_rate,
        wht_amount,
        wht_reporting_month,
        tax_base,
        wht_amount_override,
        notes
      `)
      .eq('wht_type', formType)
      .eq('wht_reporting_month', period);

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError);
      return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
    }

    if (!annotations || annotations.length === 0) {
      const emptyData: WhtFilingData = {
        period,
        form_type: formType,
        company_tax_id: COMPANY_TAX_ID,
        entries: [],
        summary: { total_entries: 0, total_tax_base: 0, total_wht: 0, complete_entries: 0, incomplete_entries: 0 },
      };
      return NextResponse.json(emptyData);
    }

    // Get bank transaction IDs and vendor IDs
    const bankTxIds = annotations.map((a: { bank_transaction_id: number }) => a.bank_transaction_id);
    const vendorIds = annotations
      .map((a: { vendor_id: string | null }) => a.vendor_id)
      .filter((id: string | null): id is string => id !== null);

    // Fetch bank transactions
    const { data: bankTxns, error: bankError } = await refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('id, transaction_date, withdrawal, description')
      .in('id', bankTxIds);

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
      return NextResponse.json({ error: "Failed to fetch bank transactions" }, { status: 500 });
    }

    // Fetch vendors
    let vendors: Array<{
      id: string;
      name: string;
      tax_id: string | null;
      address: string | null;
      is_company: boolean;
      tax_first_name: string | null;
      tax_last_name: string | null;
      prefix: string | null;
    }> = [];

    if (vendorIds.length > 0) {
      const { data: vendorData, error: vendorError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, tax_id, address, is_company, tax_first_name, tax_last_name, prefix')
        .in('id', vendorIds);

      if (vendorError) {
        console.error('Error fetching vendors:', vendorError);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
      }

      vendors = vendorData || [];
    }

    // Build lookup maps
    const bankTxMap = new Map<number, { transaction_date: string; withdrawal: number; description: string }>();
    (bankTxns || []).forEach((tx: { id: number; transaction_date: string; withdrawal: number; description: string }) => {
      bankTxMap.set(tx.id, tx);
    });

    const vendorMap = new Map<string, typeof vendors[0]>();
    vendors.forEach((v) => {
      vendorMap.set(v.id, v);
    });

    // Build WHT entries
    const entries: WhtEntry[] = annotations.map((ann: {
      id: number;
      bank_transaction_id: number;
      vendor_id: string | null;
      vendor_name_override: string | null;
      wht_rate: string;
      wht_amount: string | null;
      tax_base: string | null;
      wht_amount_override: boolean;
    }) => {
      const bankTx = bankTxMap.get(ann.bank_transaction_id);
      const vendor = ann.vendor_id ? vendorMap.get(ann.vendor_id) : null;

      const vendorName = ann.vendor_name_override || vendor?.name || 'Unknown';
      const taxId = vendor?.tax_id || '';
      const address = vendor?.address || '';
      const isCompany = vendor?.is_company || false;

      // Resolve first/last name
      let firstName = '';
      let lastName = '';
      let prefix = 'คุณ';

      if (vendor) {
        prefix = vendor.prefix || 'คุณ';

        if (vendor.tax_first_name || vendor.tax_last_name) {
          // Use stored tax filing names
          firstName = vendor.tax_first_name || '';
          lastName = vendor.tax_last_name || '';
        } else {
          // Auto-split from display name
          const nameParts = vendor.name.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else {
            firstName = vendor.name;
          }
        }

        // Companies: use company name in first_name
        if (isCompany) {
          prefix = '';
          firstName = vendor.name;
          lastName = '';
        }
      }

      // Condition defaults to 1 (standard deduction). User can change to
      // 2 (bear WHT permanently) or 3 (bear WHT one-time) via the UI.
      const condition: 1 | 2 | 3 = 1;

      // Validate completeness
      const missingFields: string[] = [];
      if (!taxId) missingFields.push('tax_id');
      if (!firstName) missingFields.push('first_name');
      if (!address) missingFields.push('address');
      if (!isCompany && !lastName) missingFields.push('last_name');

      const entry: WhtEntry = {
        id: ann.id,
        bank_transaction_id: ann.bank_transaction_id,
        transaction_date: bankTx?.transaction_date || '',
        vendor_id: ann.vendor_id,
        vendor_name: vendorName,
        tax_id: taxId,
        prefix,
        first_name: firstName,
        last_name: lastName,
        address,
        is_company: isCompany,
        description: 'ค่าใช้จ่าย',
        wht_rate: parseFloat(String(ann.wht_rate)),
        tax_base: parseFloat(String(ann.tax_base || 0)),
        wht_amount: parseFloat(String(ann.wht_amount || 0)),
        condition,
        is_complete: missingFields.length === 0,
        missing_fields: missingFields,
      };

      return entry;
    });

    // Sort by transaction_date
    entries.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

    // Summary
    const summary: WhtFilingSummary = {
      total_entries: entries.length,
      total_tax_base: Math.round(entries.reduce((sum, e) => sum + e.tax_base, 0) * 100) / 100,
      total_wht: Math.round(entries.reduce((sum, e) => sum + e.wht_amount, 0) * 100) / 100,
      complete_entries: entries.filter((e) => e.is_complete).length,
      incomplete_entries: entries.filter((e) => !e.is_complete).length,
    };

    const response: WhtFilingData = {
      period,
      form_type: formType,
      company_tax_id: COMPANY_TAX_ID,
      entries,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in WHT data endpoint:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
