/**
 * Receipt-to-transaction matching engine.
 * Pure functions with no side effects.
 */

export interface ReceiptCandidate {
  id: string;
  vendor_id: string;
  vendor_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  invoice_number: string | null;
  extraction_confidence: string | null;
  file_url: string;
  vat_type: string | null;
  wht_applicable: boolean;
  extraction_notes: string | null;
}

export interface TransactionTarget {
  id: number;
  transaction_date: string;
  withdrawal: number;
  description: string;
  details: string;
  // Existing annotation
  vendor_id: string | null;
  vendor_receipt_id: string | null; // already linked?
}

export type MatchLevel = 'auto' | 'suggested' | 'possible';

export interface MatchResult {
  receipt: ReceiptCandidate;
  score: number;
  level: MatchLevel;
  reasons: string[];
}

/**
 * Calculate the number of calendar days between two YYYY-MM-DD dates.
 */
function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs(Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Score a single receipt against a single transaction.
 * Returns null if the pair is not a viable match.
 */
export function scoreMatch(
  receipt: ReceiptCandidate,
  tx: TransactionTarget
): MatchResult | null {
  // Only match withdrawals
  if (tx.withdrawal <= 0) return null;
  // Only match receipts with an amount
  if (receipt.total_amount == null) return null;
  // Skip already-linked receipts
  if (tx.vendor_receipt_id) return null;

  let score = 0;
  const reasons: string[] = [];

  // Exact amount match (within 0.01 THB)
  const amountDiff = Math.abs(receipt.total_amount - tx.withdrawal);
  if (amountDiff < 0.02) {
    score += 40;
    reasons.push('Exact amount match');
  } else {
    // No amount match at all - not a viable candidate
    return null;
  }

  // Date matching
  if (receipt.receipt_date && tx.transaction_date) {
    const days = daysBetween(receipt.receipt_date, tx.transaction_date);
    if (days === 0) {
      score += 25;
      reasons.push('Same date');
    } else if (days === 1) {
      score += 15;
      reasons.push('Date within 1 day');
    } else if (days <= 3) {
      score += 5;
      reasons.push('Date within 3 days');
    }
  }

  // Same vendor
  if (receipt.vendor_id && tx.vendor_id && receipt.vendor_id === tx.vendor_id) {
    score += 20;
    reasons.push('Same vendor');
  }

  // Vendor name in transaction description
  if (receipt.vendor_name) {
    const desc = (tx.description + ' ' + tx.details).toLowerCase();
    const name = receipt.vendor_name.toLowerCase();
    if (desc.includes(name)) {
      score += 10;
      reasons.push('Vendor name in description');
    }
  }

  // Extraction confidence bonus
  if (receipt.extraction_confidence === 'high') {
    score += 5;
    reasons.push('High confidence extraction');
  }

  // Determine match level
  let level: MatchLevel;
  if (score >= 80) {
    level = 'auto';
  } else if (score >= 50) {
    level = 'suggested';
  } else if (score >= 30) {
    level = 'possible';
  } else {
    return null; // Below threshold
  }

  return { receipt, score, level, reasons };
}

/**
 * Find best matches for all transactions against all unlinked receipts.
 * Returns a map of bank_transaction_id -> sorted matches (max 3).
 */
export function findMatches(
  receipts: ReceiptCandidate[],
  transactions: TransactionTarget[]
): Record<number, MatchResult[]> {
  const result: Record<number, MatchResult[]> = {};
  const usedReceiptIds = new Set<string>();

  // Process transactions sorted by date
  const sortedTx = [...transactions].sort(
    (a, b) => a.transaction_date.localeCompare(b.transaction_date)
  );

  sortedTx.forEach((tx) => {
    const matches: MatchResult[] = [];

    receipts.forEach((receipt) => {
      // Skip receipts already matched as "auto" in a previous tx
      if (usedReceiptIds.has(receipt.id)) return;

      const match = scoreMatch(receipt, tx);
      if (match) {
        matches.push(match);
      }
    });

    // Sort by score desc, keep top 3
    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, 3);

    if (top.length > 0) {
      result[tx.id] = top;
      // Reserve "auto" matches
      top.forEach((m) => {
        if (m.level === 'auto') {
          usedReceiptIds.add(m.receipt.id);
        }
      });
    }
  });

  return result;
}
