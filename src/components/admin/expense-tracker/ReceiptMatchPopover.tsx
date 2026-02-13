'use client';

import { useState } from 'react';
import { Link2, ExternalLink, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MatchResult } from '@/lib/receipt-matching-engine';

interface ReceiptMatchPopoverProps {
  matches: MatchResult[];
  onLink: (receiptId: string) => Promise<void>;
}

function levelColor(level: string): string {
  switch (level) {
    case 'auto': return 'bg-green-100 text-green-700';
    case 'suggested': return 'bg-blue-100 text-blue-700';
    case 'possible': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function formatAmount(n: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReceiptMatchPopover({ matches, onLink }: ReceiptMatchPopoverProps) {
  const [linking, setLinking] = useState<string | null>(null);

  const handleLink = async (receiptId: string) => {
    setLinking(receiptId);
    try {
      await onLink(receiptId);
    } finally {
      setLinking(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center h-6 w-6 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
          title={`${matches.length} receipt match${matches.length > 1 ? 'es' : ''}`}
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white leading-none">
            {matches.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Matching Receipts
          </h4>
          {matches.map((match) => (
            <div
              key={match.receipt.id}
              className="rounded-lg border p-2 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${levelColor(match.level)}`}>
                    {match.level === 'auto' ? 'Auto' : match.level === 'suggested' ? 'Match' : 'Possible'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Score: {match.score}
                  </span>
                </div>
                <a
                  href={match.receipt.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                  title="View receipt"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="text-xs space-y-0.5">
                {match.receipt.vendor_name && (
                  <div className="font-medium truncate">{match.receipt.vendor_name}</div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>{match.receipt.receipt_date}</span>
                  <span className="font-medium text-foreground">
                    {formatAmount(match.receipt.total_amount)} THB
                  </span>
                </div>
                {match.receipt.invoice_number && (
                  <div className="text-muted-foreground">
                    Inv# {match.receipt.invoice_number}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {match.reasons.map((r, i) => (
                  <span key={i} className="text-[9px] bg-muted px-1 py-px rounded">
                    {r}
                  </span>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={() => handleLink(match.receipt.id)}
                disabled={linking !== null}
              >
                {linking === match.receipt.id ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-1 h-3 w-3" />
                    Link Receipt
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
