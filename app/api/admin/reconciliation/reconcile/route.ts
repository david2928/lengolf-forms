import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// According to memory, only public.bookings table should be used, not backoffice.bookings
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface InvoiceItem {
  id: string;
  date: string;
  customerName: string;
  productType?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  rawData: Record<string, any>;
  sku?: string;
}

interface POSSalesRecord {
  id: number;
  date: string;
  customerName: string;
  productName: string;
  productCategory: string;
  quantity: number;
  totalAmount: number;
  skuNumber?: string;
  isVoided: boolean;
}

interface MatchedItem {
  invoiceItem: InvoiceItem;
  posRecord: POSSalesRecord;
  matchType: 'exact' | 'fuzzy_name' | 'fuzzy_amount' | 'fuzzy_both';
  confidence: number;
  variance: {
    amountDiff: number;
    quantityDiff: number;
    nameSimilarity: number;
  };
}

interface ReconciliationResult {
  matched: MatchedItem[];
  invoiceOnly: InvoiceItem[];
  posOnly: POSSalesRecord[];
  summary: {
    totalInvoiceItems: number;
    totalPOSRecords: number;
    matchedCount: number;
    matchRate: number;
    totalInvoiceAmount: number;
    totalPOSAmount: number;
    varianceAmount: number;
    variancePercentage: number;
  };
  sessionId: string;
}

interface ReconciliationRequest {
  invoiceData: InvoiceItem[];
  reconciliationType: string;
  dateRange: { start: string; end: string };
  options?: {
    toleranceAmount?: number;
    tolerancePercentage?: number;
    nameSimilarityThreshold?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReconciliationRequest = await request.json();
    const { invoiceData, reconciliationType, dateRange, options = {} } = body;

    // Validate request
    if (!invoiceData || !Array.isArray(invoiceData) || invoiceData.length === 0) {
      return NextResponse.json({ error: 'Invalid invoice data' }, { status: 400 });
    }

    if (!reconciliationType || !['golf_coaching_ratchavin', 'golf_coaching_boss', 'golf_coaching_noon', 'smith_and_co_restaurant'].includes(reconciliationType)) {
      return NextResponse.json({ error: 'Invalid reconciliation type' }, { status: 400 });
    }

    // Set default options
    const defaultOptions = {
      toleranceAmount: 50, // ฿50 tolerance
      tolerancePercentage: 5, // 5% tolerance
      nameSimilarityThreshold: 0.8 // 80% similarity threshold
    };
    const reconciliationOptions = { ...defaultOptions, ...options };

    // Fetch POS data
    const posData = await fetchPOSData(reconciliationType, dateRange);
    
    // Perform reconciliation
    const result = await performReconciliation(
      invoiceData,
      posData,
      reconciliationOptions,
      session.user.email,
      reconciliationType,
      dateRange
    );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Reconciliation failed' 
    }, { status: 500 });
  }
}

async function fetchPOSData(reconciliationType: string, dateRange: { start: string; end: string }): Promise<POSSalesRecord[]> {
  let query;
  
  switch (reconciliationType) {
    case 'smith_and_co_restaurant':
      const { data: skuData, error } = await supabase.rpc('get_sales_by_sku', {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      if (error) {
        throw new Error(`Failed to fetch Smith & Co POS data: ${error.message}`);
      }
      
      return (skuData || []).map((record: any) => ({
        id: record.sku_number, // Use SKU as a unique identifier for this context
        date: record.date,
        customerName: 'N/A', // Not applicable for SKU-based reconciliation
        productName: record.product_name,
        productCategory: 'N/A',
        quantity: record.total_quantity,
        totalAmount: record.total_amount,
        skuNumber: record.sku_number,
        isVoided: false,
      }));

    case 'golf_coaching_ratchavin':
    case 'golf_coaching_boss':  
    case 'golf_coaching_noon':
      // Golf coaching reconciliation: use coach earnings data for actual lesson values
      const coachName = reconciliationType === 'golf_coaching_ratchavin'
        ? 'RATCHAVIN'
        : reconciliationType === 'golf_coaching_boss'
          ? 'BOSS'
          : 'NOON';

      const { data: earningsData, error: earningsError } = await supabase
        .schema('backoffice')
        .from('coach_earnings')
        .select('receipt_number, date, customer_name, rate_type, hour_cnt, coach_earnings')
        .eq('coach', coachName)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
        .order('customer_name', { ascending: true });

      if (earningsError) {
        throw new Error(`Failed to fetch coach earnings data: ${earningsError.message}`);
      }
      
      // Transform earnings data to match POSSalesRecord interface and return
      return (earningsData || []).map((earning: any, index: number) => ({
        id: index + 1, // Use index as ID since table doesn't have id column
        date: earning.date,
        customerName: earning.customer_name || 'Unknown',
        productName: `${earning.rate_type} Lesson`,
        productCategory: 'Coaching',
        quantity: earning.hour_cnt || 1,
        totalAmount: parseFloat(earning.coach_earnings || '0'),
        skuNumber: '',
        isVoided: false,
        receiptNumber: earning.receipt_number
      }));

    default:
      throw new Error('Invalid reconciliation type');
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch POS data: ${error.message}`);
  }

  // Transform to consistent format
  return (data || []).map((record: any) => ({
    id: record.id || 0,
    date: record.date,
    customerName: record.customer_name || '',
    productName: record.product_name || '',
    productCategory: record.product_category || '',
    quantity: record.item_cnt || 0,
    totalAmount: parseFloat(record.item_price_incl_vat || 0),
    skuNumber: record.sku_number || '',
    isVoided: record.is_voided || false
  }));
}

async function performReconciliation(
  invoiceData: InvoiceItem[],
  posData: POSSalesRecord[],
  options: any,
  userEmail: string,
  reconciliationType: string,
  dateRange: { start: string; end: string }
): Promise<ReconciliationResult> {
  console.log(`🔄 Starting reconciliation for ${reconciliationType}`);
  console.log(`📊 Invoice data: ${invoiceData.length} items`);
  console.log(`🏪 POS data: ${posData.length} records`);
  console.log(`📅 Date range: ${dateRange.start} to ${dateRange.end}`);
  
  // Log sample data for debugging
  if (invoiceData.length > 0) {
    console.log(`📋 Sample invoice item:`, JSON.stringify(invoiceData[0], null, 2));
  }
  if (posData.length > 0) {
    console.log(`🛒 Sample POS record:`, JSON.stringify(posData[0], null, 2));
  }

  const matched: MatchedItem[] = [];
  const invoiceOnly: InvoiceItem[] = [];
  const posOnly: POSSalesRecord[] = [...posData];

  // Create session ID - use crypto.randomUUID() for proper UUID format
  const sessionId = crypto.randomUUID();
  console.log(`🆔 Generated session ID: ${sessionId}`);

  // Process each invoice item
  const optionsWithType = { ...options, reconciliationType };

  if (reconciliationType === 'smith_and_co_restaurant') {
    // SKU-based matching for Smith & Co
    for (const invoiceItem of invoiceData) {
      const match = findSkuMatch(invoiceItem, posOnly, optionsWithType);
      if (match) {
        matched.push(match);
        const index = posOnly.findIndex(pos => pos.skuNumber === match.posRecord.skuNumber && pos.date === match.posRecord.date);
        if (index > -1) {
          posOnly.splice(index, 1);
        }
      } else {
        invoiceOnly.push(invoiceItem);
      }
    }
  } else {
    // Original customer name-based matching for coaching
    for (const invoiceItem of invoiceData) {
      const matches = findMatches(invoiceItem, posOnly, optionsWithType);
      
      if (matches.length > 0) {
        // Take the best match (highest confidence)
        const bestMatch = matches[0];
        matched.push(bestMatch);
        
        // Remove matched POS record from remaining pool
        const index = posOnly.findIndex(pos => pos.id === bestMatch.posRecord.id);
        if (index > -1) {
          posOnly.splice(index, 1);
        }
      } else {
        invoiceOnly.push(invoiceItem);
      }
    }
  }

  // Calculate summary statistics
  const totalInvoiceAmount = invoiceData.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPOSAmount = posData.reduce((sum, record) => sum + record.totalAmount, 0);
  const matchedAmount = matched.reduce((sum, match) => sum + match.invoiceItem.totalAmount, 0);
  const varianceAmount = totalInvoiceAmount - totalPOSAmount;

  console.log(`💰 Financial Summary:`);
  console.log(`  📋 Invoice total: ฿${totalInvoiceAmount} (${invoiceData.length} items)`);
  console.log(`  🛒 POS total: ฿${totalPOSAmount} (${posData.length} records)`);
  console.log(`  ✅ Matched: ${matched.length} items (฿${matchedAmount})`);
  console.log(`  📋 Invoice only: ${invoiceOnly.length} items`);
  console.log(`  🛒 POS only: ${posOnly.length} records`);
  console.log(`  📊 Variance: ฿${varianceAmount}`);

  const summary = {
    totalInvoiceItems: invoiceData.length,
    totalPOSRecords: posData.length,
    matchedCount: matched.length,
    matchRate: invoiceData.length > 0 ? (matched.length / invoiceData.length) * 100 : 0,
    totalInvoiceAmount,
    totalPOSAmount,
    varianceAmount,
    variancePercentage: totalPOSAmount > 0 ? (varianceAmount / totalPOSAmount) * 100 : 0
  };

  console.log(`📊 Final Summary:`, JSON.stringify(summary, null, 2));

  // Save reconciliation session to database
  await saveReconciliationSession({
    sessionId,
    userEmail,
    reconciliationType,
    dateRange,
    fileName: 'uploaded_file.xlsx', // TODO: Get actual filename from request
    summary,
    matched,
    invoiceOnly,
    posOnly
  });

  return {
    matched,
    invoiceOnly,
    posOnly,
    summary,
    sessionId
  };
}

function findSkuMatch(invoiceItem: InvoiceItem, posRecords: POSSalesRecord[], options: any): MatchedItem | null {
  if (!invoiceItem.sku) {
    return null;
  }

  const potentialMatch = posRecords.find(pos =>
    pos.skuNumber === invoiceItem.sku &&
    pos.date === invoiceItem.date
  );

  if (!potentialMatch) {
    return null;
  }

  // For SKU matching, we can assume high confidence if SKU and date match.
  // We can also check quantity and amount for a more detailed match.
  const quantityDiff = Math.abs(invoiceItem.quantity - potentialMatch.quantity);
  const amountDiff = Math.abs(invoiceItem.totalAmount - potentialMatch.totalAmount);

  // Consider it a match if SKU and date are the same, and quantity is exact.
  if (quantityDiff === 0) {
    return {
      invoiceItem,
      posRecord: potentialMatch,
      matchType: 'exact',
      confidence: 1.0,
      variance: {
        amountDiff,
        quantityDiff,
        nameSimilarity: 1.0 // N/A for SKU match
      }
    };
  }

  return null;
}

function findMatches(invoiceItem: InvoiceItem, posRecords: POSSalesRecord[], options: any): MatchedItem[] {
  const matches: MatchedItem[] = [];

  for (const posRecord of posRecords) {
    const match = calculateMatch(invoiceItem, posRecord, options);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

function calculateMatch(invoiceItem: InvoiceItem, posRecord: POSSalesRecord, options: any): MatchedItem | null {
  // All reconciliation types require exact date match
  // Golf coaching: Invoice date = lesson date (both should be same day)
  // Restaurant: Transaction date = POS date (same day)
  if (invoiceItem.date !== posRecord.date) {
    return null;
  }

  // Calculate name similarity
  const nameSimilarity = calculateLevenshteinSimilarity(
    normalizeCustomerName(invoiceItem.customerName),
    normalizeCustomerName(posRecord.customerName)
  );

  // Calculate amount variance
  const amountDiff = Math.abs(invoiceItem.totalAmount - posRecord.totalAmount);
  const amountPercentageDiff = posRecord.totalAmount > 0 
    ? (amountDiff / posRecord.totalAmount) * 100 
    : 100;

  // Calculate quantity variance
  const quantityDiff = Math.abs(invoiceItem.quantity - posRecord.quantity);

  // Determine match type and confidence based on reconciliation type
  let matchType: 'exact' | 'fuzzy_name' | 'fuzzy_amount' | 'fuzzy_both';
  let confidence = 0;
  const isGolfCoaching = options.reconciliationType?.includes('golf_coaching');

  if (isGolfCoaching) {
    // For golf coaching: Match on customer names, quantity, and amounts (now using coach earnings data)
    if (nameSimilarity >= 0.95 && quantityDiff === 0 && amountDiff <= options.toleranceAmount) {
      matchType = 'exact';
      confidence = 1.0;
    } else if (nameSimilarity >= options.nameSimilarityThreshold && quantityDiff === 0 && amountDiff <= options.toleranceAmount) {
      matchType = 'fuzzy_name';
      confidence = 0.7 + (nameSimilarity - options.nameSimilarityThreshold) * 0.3;
    } else if (nameSimilarity >= 0.95 && quantityDiff === 0 && (amountDiff <= options.toleranceAmount * 2 || amountPercentageDiff <= options.tolerancePercentage)) {
      matchType = 'fuzzy_amount';
      confidence = 0.6 + (1 - Math.min(amountPercentageDiff / options.tolerancePercentage, 1)) * 0.3;
    } else {
      return null;
    }
  } else {
    // For restaurant reconciliation, match on names and amounts
    // Exact match: same name and amount
    if (nameSimilarity >= 0.95 && amountDiff <= 1) {
      matchType = 'exact';
      confidence = 1.0;
    }
    // Fuzzy name match: similar names, exact amount
    else if (nameSimilarity >= options.nameSimilarityThreshold && amountDiff <= options.toleranceAmount) {
      matchType = 'fuzzy_name';
      confidence = 0.8 + (nameSimilarity - options.nameSimilarityThreshold) * 0.2;
    }
    // Fuzzy amount match: exact name, similar amount
    else if (nameSimilarity >= 0.95 && (amountDiff <= options.toleranceAmount || amountPercentageDiff <= options.tolerancePercentage)) {
      matchType = 'fuzzy_amount';
      confidence = 0.7 + (1 - Math.min(amountPercentageDiff / options.tolerancePercentage, 1)) * 0.2;
    }
    // Fuzzy both: similar names and amounts
    else if (nameSimilarity >= options.nameSimilarityThreshold && 
             (amountDiff <= options.toleranceAmount || amountPercentageDiff <= options.tolerancePercentage)) {
      matchType = 'fuzzy_both';
      confidence = 0.5 + (nameSimilarity - options.nameSimilarityThreshold) * 0.3 + 
                   (1 - Math.min(amountPercentageDiff / options.tolerancePercentage, 1)) * 0.2;
    }
    // No match
    else {
      return null;
    }
  }

  return {
    invoiceItem,
    posRecord,
    matchType,
    confidence,
    variance: {
      amountDiff,
      quantityDiff,
      nameSimilarity
    }
  };
}

function normalizeCustomerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

async function saveReconciliationSession(sessionData: any): Promise<void> {
  try {
    console.log(`💾 Saving reconciliation session...`);
    console.log(`📝 Session data keys:`, Object.keys(sessionData));
    
    // Save session summary to backoffice.reconciliation_sessions
    const { error: sessionError } = await supabase
      .schema('backoffice')
      .from('reconciliation_sessions')
      .insert({
        id: sessionData.sessionId,
        reconciliation_type: sessionData.reconciliationType,
        file_name: sessionData.fileName || 'unknown_file',
        date_range_start: sessionData.dateRange?.start || new Date().toISOString().split('T')[0],
        date_range_end: sessionData.dateRange?.end || new Date().toISOString().split('T')[0],
        total_invoice_items: sessionData.summary.totalInvoiceItems,
        total_pos_records: sessionData.summary.totalPOSRecords,
        matched_items: sessionData.summary.matchedCount, // Fixed: use matched_items instead of matched_count
        match_rate: sessionData.summary.matchRate,
        total_invoice_amount: sessionData.summary.totalInvoiceAmount,
        total_pos_amount: sessionData.summary.totalPOSAmount,
        variance_amount: sessionData.summary.varianceAmount,
        variance_percentage: sessionData.summary.variancePercentage,
        created_at: new Date().toISOString()
      });

    if (sessionError) {
      console.error('❌ Failed to save reconciliation session:', sessionError);
      return;
    } else {
      console.log('✅ Reconciliation session saved successfully');
    }

    // Save individual reconciliation items
    const items = [
      // Matched items
      ...sessionData.matched.map((match: MatchedItem) => ({
        session_id: sessionData.sessionId,
        item_type: 'matched',
        match_type: match.matchType,
        confidence: match.confidence,
        amount_variance: match.variance.amountDiff,
        quantity_variance: match.variance.quantityDiff,
        invoice_data: match.invoiceItem,
        pos_data: match.posRecord
      })),
      // Invoice-only items
      ...sessionData.invoiceOnly.map((item: InvoiceItem) => ({
        session_id: sessionData.sessionId,
        item_type: 'invoice_only',
        invoice_data: item
      })),
      // POS-only items
      ...sessionData.posOnly.map((record: POSSalesRecord) => ({
        session_id: sessionData.sessionId,
        item_type: 'pos_only',
        pos_data: record
      }))
    ];

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .schema('backoffice')
        .from('reconciliation_items')
        .insert(items);

      if (itemsError) {
        console.error('Failed to save reconciliation items:', itemsError);
      }
    }

  } catch (error) {
    console.error('Error saving reconciliation session:', error);
  }
} 