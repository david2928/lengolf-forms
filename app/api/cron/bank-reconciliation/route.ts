import { NextRequest, NextResponse } from 'next/server';
import { fetchReconciliationData, DEFAULT_BANK_ACCOUNT_NUMBER } from '../../../admin/bank-reconciliation/lib/fetch-reconciliation-data';
import { transformBankTransactions } from '../../../admin/bank-reconciliation/lib/transform-bank-data';
import { runReconciliation } from '../../../admin/bank-reconciliation/lib/reconciliation-engine';
import { createLineClient } from '@/lib/line-messaging';
import { LINE_MESSAGING } from '@/lib/constants';
import { buildDiscrepancyFlexMessage, buildMissingDataFlexMessage } from './build-flex-message';

const BANK_ACCOUNT_NUMBER = DEFAULT_BANK_ACCOUNT_NUMBER;

/** Get yesterday's date in Bangkok timezone (UTC+7) as YYYY-MM-DD */
function getYesterdayBangkok(): string {
  const now = new Date();
  // Shift to Bangkok time (UTC+7)
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset + now.getTimezoneOffset() * 60 * 1000);
  bangkokNow.setDate(bangkokNow.getDate() - 1);
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get the next calendar date as YYYY-MM-DD (explicit UTC to avoid timezone drift) */
function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function sendLineError(message: string): Promise<void> {
  try {
    const token = LINE_MESSAGING.channelAccessToken;
    const groupId = LINE_MESSAGING.groups.default;
    if (!token || !groupId) return;
    const client = createLineClient(token);
    await client.pushTextMessage(groupId, message);
  } catch (e) {
    console.error('Failed to send LINE error alert:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yesterday = getYesterdayBangkok();
    const today = getNextDate(yesterday);
    console.log(`[bank-recon-cron] Running for yesterday=${yesterday}, fetching range ${yesterday}..${today}`);

    // Fetch data for yesterday AND today (today needed for eWallet T+1 settlement)
    const dbData = await fetchReconciliationData(yesterday, today, BANK_ACCOUNT_NUMBER);

    // Transform bank transactions into parsed format
    const bankParsed = transformBankTransactions(
      dbData.bankTransactions,
      BANK_ACCOUNT_NUMBER,
      yesterday,
      today
    );

    // Run reconciliation engine
    const { days } = runReconciliation(bankParsed, dbData);

    // Find yesterday's result
    const yesterdayResult = days.find(d => d.date === yesterday);

    // Check if ALL data sources are empty for yesterday
    const hasBankStatement = dbData.bankTransactions.some(t => t.transaction_date === yesterday);
    const hasMerchantData = dbData.merchantSettlements.some(m => m.report_date === yesterday);
    const hasDailyClosing = dbData.dailyClosings.some(c => c.closing_date === yesterday);
    const hasDailySales = dbData.dailySales.some(s => s.date === yesterday);
    const allEmpty = !hasBankStatement && !hasMerchantData && !hasDailyClosing && !hasDailySales;

    const token = LINE_MESSAGING.channelAccessToken;
    const groupId = LINE_MESSAGING.groups.default;

    if (!token || !groupId) {
      console.error('[bank-recon-cron] LINE credentials not configured');
      return NextResponse.json({
        status: 'error',
        message: 'LINE credentials not configured',
        date: yesterday,
      }, { status: 500 });
    }

    const client = createLineClient(token);

    // Case 1: All data sources are empty - send missing data alert
    if (allEmpty) {
      console.log(`[bank-recon-cron] All data sources empty for ${yesterday} - sending missing data alert`);
      const flexContent = buildMissingDataFlexMessage(yesterday, {
        hasBankStatement,
        hasMerchantData,
        hasDailyClosing,
        hasDailySales,
      });
      await client.pushFlexMessage(
        groupId,
        `Bank Reconciliation: Data Missing for ${yesterday}`,
        flexContent
      );
      return NextResponse.json({
        status: 'notified',
        reason: 'all_data_missing',
        date: yesterday,
      });
    }

    // Case 2: Some data is missing (partial) - send missing data notification
    const someDataMissing = !hasBankStatement || !hasMerchantData || !hasDailyClosing || !hasDailySales;
    if (someDataMissing) {
      console.log(`[bank-recon-cron] Some data sources missing for ${yesterday} - sending missing data alert`);
      const flexContent = buildMissingDataFlexMessage(yesterday, {
        hasBankStatement,
        hasMerchantData,
        hasDailyClosing,
        hasDailySales,
      });
      await client.pushFlexMessage(
        groupId,
        `Bank Reconciliation: Data Missing for ${yesterday}`,
        flexContent
      );
      return NextResponse.json({
        status: 'notified',
        reason: 'partial_data_missing',
        date: yesterday,
        missing: {
          bankStatement: !hasBankStatement,
          merchantData: !hasMerchantData,
          dailyClosing: !hasDailyClosing,
          dailySales: !hasDailySales,
        },
      });
    }

    // Case 3: Data exists - check reconciliation result
    if (!yesterdayResult) {
      console.log(`[bank-recon-cron] No reconciliation result for ${yesterday} despite data existing`);
      return NextResponse.json({
        status: 'skipped',
        reason: 'no_result',
        date: yesterday,
      });
    }

    if (yesterdayResult.overallStatus === 'matched' || yesterdayResult.overallStatus === 'not_applicable') {
      console.log(`[bank-recon-cron] ${yesterday} status=${yesterdayResult.overallStatus} - no notification needed`);
      return NextResponse.json({
        status: 'ok',
        reason: 'matched',
        date: yesterday,
        overallStatus: yesterdayResult.overallStatus,
      });
    }

    // Case 4: Variance or missing - send discrepancy notification
    console.log(`[bank-recon-cron] ${yesterday} status=${yesterdayResult.overallStatus} - sending discrepancy alert`);
    const flexContent = buildDiscrepancyFlexMessage(yesterdayResult);
    await client.pushFlexMessage(
      groupId,
      `Bank Reconciliation: ${yesterdayResult.overallStatus === 'variance' ? 'Discrepancy' : 'Issues'} on ${yesterday}`,
      flexContent
    );

    return NextResponse.json({
      status: 'notified',
      reason: yesterdayResult.overallStatus,
      date: yesterday,
      totalGap: yesterdayResult.totalGap,
      unreconciledCount: yesterdayResult.unreconciledCount,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bank-recon-cron] Error:', errorMessage);

    // Attempt to send error alert via LINE
    await sendLineError(
      `\u26A0\uFE0F Bank Reconciliation Cron Error\n\nThe daily bank reconciliation check failed.\nError: ${errorMessage}\n\nPlease check the admin page manually.`
    );

    return NextResponse.json({
      status: 'error',
      message: errorMessage,
    }, { status: 500 });
  }
}
