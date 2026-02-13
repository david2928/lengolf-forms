import type { DailyReconciliation, ComparisonStatus } from '../../../admin/bank-reconciliation/types/bank-reconciliation';

const r2 = (n: number) => Math.round(n * 100) / 100;

function formatThb(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusEmoji(status: ComparisonStatus): string {
  switch (status) {
    case 'matched': return '\u2705';       // green check
    case 'variance': return '\u274C';      // red X
    case 'missing': return '\u26A0\uFE0F'; // warning
    case 'partial': return '\u2753';       // question mark
    default: return '\u2796';              // dash
  }
}

function statusColor(status: ComparisonStatus): string {
  switch (status) {
    case 'matched': return '#27AE60';
    case 'variance': return '#E74C3C';
    case 'missing': return '#F39C12';
    default: return '#95A5A6';
  }
}

function statusLabel(status: ComparisonStatus): string {
  switch (status) {
    case 'matched': return 'Matched';
    case 'variance': return 'Variance';
    case 'missing': return 'Missing Data';
    case 'partial': return 'Partial';
    default: return 'N/A';
  }
}

interface FlowRow {
  label: string;
  status: ComparisonStatus;
  variance: number;
  /** Override display text (e.g. "Pending" instead of "Missing Data") */
  displayLabel?: string;
  displayColor?: string;
  displayEmoji?: string;
  /** True if this row should be excluded from effective overall status */
  isPending?: boolean;
}

function buildFlowRows(day: DailyReconciliation): FlowRow[] {
  const rows: FlowRow[] = [];

  // Card flow
  const cardStatuses = [day.cardFlow.posVsMerchantGross.status, day.cardFlow.merchantNetVsBank.status];
  const cardActive = cardStatuses.some(s => s !== 'not_applicable');
  if (cardActive) {
    const cardVariance = r2(
      (day.cardFlow.posVsMerchantGross.variance || 0) + (day.cardFlow.merchantNetVsBank.variance || 0)
    );
    const cardStatus: ComparisonStatus = cardStatuses.includes('variance') ? 'variance'
      : cardStatuses.includes('missing') ? 'missing' : 'matched';
    rows.push({ label: 'Card', status: cardStatus, variance: cardVariance });
  }

  // eWallet flow
  const ewStatuses = [day.ewalletFlow.posVsMerchantGross.status, day.ewalletFlow.merchantNetVsBank.status];
  const ewActive = ewStatuses.some(s => s !== 'not_applicable');
  if (ewActive) {
    const ewVariance = r2(
      (day.ewalletFlow.posVsMerchantGross.variance || 0) + (day.ewalletFlow.merchantNetVsBank.variance || 0)
    );
    const ewStatus: ComparisonStatus = ewStatuses.includes('variance') ? 'variance'
      : ewStatuses.includes('missing') ? 'missing' : 'matched';

    // eWallet merchant files arrive inconsistently (often days later).
    // When POS has eWallet sales but no merchant file yet, show "Pending" instead of "Missing Data".
    const ewalletFilePending = ewStatus === 'missing'
      && day.merchantEwallet.length === 0
      && day.ewalletFlow.posEwallet > 0;

    rows.push({
      label: 'eWallet',
      status: ewStatus,
      variance: ewVariance,
      ...(ewalletFilePending ? {
        displayLabel: 'Pending',
        displayColor: '#3498DB',    // blue
        displayEmoji: '\u23F3',     // hourglass
        isPending: true,
      } : {}),
    });
  }

  // Cash flow
  if (day.cashFlow.status !== 'not_applicable') {
    rows.push({
      label: 'Cash',
      status: day.cashFlow.status,
      variance: day.cashFlow.cashVariance,
    });
  }

  // QR flow
  if (day.qrFlow.status !== 'not_applicable') {
    rows.push({
      label: 'QR',
      status: day.qrFlow.status,
      variance: day.qrFlow.posVsBankTransfers.variance || 0,
    });
  }

  return rows;
}

/**
 * Compute the effective overall status for the notification badge,
 * excluding flows marked as "pending" (e.g. eWallet file not yet uploaded).
 */
function getEffectiveOverallStatus(day: DailyReconciliation, flowRows: FlowRow[]): ComparisonStatus {
  const nonPendingRows = flowRows.filter(r => !r.isPending);
  const statuses = nonPendingRows.map(r => r.status).filter(s => s !== 'not_applicable');
  const hasEwalletPending = flowRows.some(r => r.label === 'eWallet' && r.isPending);

  // Adjust gap to exclude pending eWallet POS amount
  const adjustedGap = hasEwalletPending
    ? r2(day.totalGap - day.ewalletFlow.posEwallet)
    : day.totalGap;

  if (statuses.length === 0) return day.overallStatus;
  if (statuses.some(s => s === 'missing')) return 'missing';
  if (statuses.some(s => s === 'variance')) return 'variance';
  // Also check gap and unreconciled
  if (day.unreconciledCount > 0) return 'variance';
  if (Math.abs(adjustedGap) > 0.01) return 'variance';
  return 'matched';
}

/**
 * Build a Flex Message bubble for a discrepancy / variance notification.
 */
export function buildDiscrepancyFlexMessage(day: DailyReconciliation): Record<string, unknown> {
  const flowRows = buildFlowRows(day);
  const effectiveStatus = getEffectiveOverallStatus(day, flowRows);
  const hasEwalletPending = flowRows.some(r => r.label === 'eWallet' && r.isPending);

  // When eWallet is pending, exclude its POS amount from gap to avoid misleading totals.
  // The raw gap includes eWallet POS sales but has no matching settlement to offset it.
  const adjustedGap = hasEwalletPending
    ? r2(day.totalGap - day.ewalletFlow.posEwallet)
    : day.totalGap;

  const flowContents = flowRows.map(row => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `${row.displayEmoji || statusEmoji(row.status)} ${row.label}`,
        size: 'sm',
        color: '#555555',
        flex: 3,
      },
      {
        type: 'text',
        text: row.displayLabel || statusLabel(row.status),
        size: 'sm',
        color: row.displayColor || statusColor(row.status),
        flex: 2,
        align: 'center',
      },
      {
        type: 'text',
        text: row.isPending ? '-' : (row.variance !== 0 ? `${row.variance > 0 ? '+' : ''}${formatThb(row.variance)}` : '-'),
        size: 'sm',
        color: (!row.isPending && row.variance !== 0) ? '#E74C3C' : '#999999',
        flex: 3,
        align: 'end',
      },
    ],
    margin: 'sm',
  }));

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\uD83C\uDFE6 Bank Reconciliation',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'lg',
              flex: 4,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'text',
                text: statusLabel(effectiveStatus),
                size: 'xs',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
              }],
              backgroundColor: effectiveStatus === 'variance' ? '#C0392B' : effectiveStatus === 'matched' ? '#27AE60' : '#E67E22',
              cornerRadius: 'md',
              paddingAll: 'xs',
              flex: 2,
              justifyContent: 'center',
            },
          ],
          alignItems: 'center',
        },
        {
          type: 'text',
          text: day.date,
          color: '#FFFFFFCC',
          size: 'sm',
          margin: 'sm',
        },
      ],
      backgroundColor: effectiveStatus === 'matched' ? '#27AE60' : effectiveStatus === 'variance' ? '#E74C3C' : '#F39C12',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Column headers
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'Flow', size: 'xs', color: '#AAAAAA', flex: 3, weight: 'bold' },
            { type: 'text', text: 'Status', size: 'xs', color: '#AAAAAA', flex: 2, align: 'center', weight: 'bold' },
            { type: 'text', text: 'Variance', size: 'xs', color: '#AAAAAA', flex: 3, align: 'end', weight: 'bold' },
          ],
          margin: 'md',
        },
        { type: 'separator', margin: 'sm' },
        // Flow rows
        ...flowContents,
        { type: 'separator', margin: 'lg' },
        // Total gap (adjusted when eWallet is pending)
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: hasEwalletPending ? 'Gap (excl. eWallet)' : 'Total Gap',
              size: 'sm',
              color: '#333333',
              weight: 'bold',
              flex: 5,
            },
            {
              type: 'text',
              text: `${formatThb(adjustedGap)} THB`,
              size: 'sm',
              color: Math.abs(adjustedGap) > 0.01 ? '#E74C3C' : '#27AE60',
              weight: 'bold',
              flex: 3,
              align: 'end',
            },
          ],
          margin: 'md',
        },
        // Unreconciled count (only if > 0)
        ...(day.unreconciledCount > 0 ? [{
          type: 'box' as const,
          layout: 'horizontal' as const,
          contents: [
            {
              type: 'text' as const,
              text: 'Unreconciled Txns',
              size: 'sm' as const,
              color: '#333333',
              flex: 5,
            },
            {
              type: 'text' as const,
              text: String(day.unreconciledCount),
              size: 'sm' as const,
              color: '#E74C3C',
              weight: 'bold' as const,
              flex: 3,
              align: 'end' as const,
            },
          ],
          margin: 'sm' as const,
        }] : []),
        // POS total
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: 'POS Total',
              size: 'xs',
              color: '#999999',
              flex: 5,
            },
            {
              type: 'text',
              text: `${formatThb(day.posTotal)} THB`,
              size: 'xs',
              color: '#999999',
              flex: 3,
              align: 'end',
            },
          ],
          margin: 'sm',
        },
      ],
      paddingAll: 'lg',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'Review Details',
            uri: 'https://lengolf-forms.vercel.app/admin/bank-reconciliation',
          },
          style: 'link',
          height: 'sm',
        },
      ],
      paddingAll: 'md',
    },
  };
}

interface MissingDataInfo {
  hasBankStatement: boolean;
  hasMerchantData: boolean;
  hasDailyClosing: boolean;
  hasDailySales: boolean;
}

/**
 * Build a Flex Message bubble for a "data missing" notification.
 */
export function buildMissingDataFlexMessage(date: string, missing: MissingDataInfo): Record<string, unknown> {
  const sources = [
    { label: 'Bank Statement', present: missing.hasBankStatement },
    { label: 'Merchant Settlements', present: missing.hasMerchantData },
    { label: 'Daily Closing', present: missing.hasDailyClosing },
    { label: 'POS Sales', present: missing.hasDailySales },
  ];

  const absentSources = sources.filter(s => !s.present);
  const presentSources = sources.filter(s => s.present);

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\uD83C\uDFE6 Bank Reconciliation',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'lg',
              flex: 4,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'text',
                text: 'Data Missing',
                size: 'xs',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
              }],
              backgroundColor: '#D35400',
              cornerRadius: 'md',
              paddingAll: 'xs',
              flex: 2,
              justifyContent: 'center',
            },
          ],
          alignItems: 'center',
        },
        {
          type: 'text',
          text: date,
          color: '#FFFFFFCC',
          size: 'sm',
          margin: 'sm',
        },
      ],
      backgroundColor: '#F39C12',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'Missing Data Sources',
          size: 'sm',
          weight: 'bold',
          color: '#E74C3C',
          margin: 'md',
        },
        ...absentSources.map(s => ({
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '\u274C', size: 'sm', flex: 0 },
            { type: 'text', text: s.label, size: 'sm', color: '#555555', margin: 'sm' },
          ],
          margin: 'sm',
        })),
        ...(presentSources.length > 0 ? [
          { type: 'separator' as const, margin: 'lg' as const },
          {
            type: 'text' as const,
            text: 'Available Data Sources',
            size: 'sm' as const,
            weight: 'bold' as const,
            color: '#27AE60',
            margin: 'md' as const,
          },
          ...presentSources.map(s => ({
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '\u2705', size: 'sm' as const, flex: 0 },
              { type: 'text' as const, text: s.label, size: 'sm' as const, color: '#555555', margin: 'sm' as const },
            ],
            margin: 'sm' as const,
          })),
        ] : []),
      ],
      paddingAll: 'lg',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'Upload Missing Data',
            uri: 'https://lengolf-forms.vercel.app/admin/bank-reconciliation',
          },
          style: 'link',
          height: 'sm',
        },
      ],
      paddingAll: 'md',
    },
  };
}
