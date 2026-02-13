import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { fetchReconciliationData } from '../../../../admin/bank-reconciliation/lib/fetch-reconciliation-data';
import type { ReconciliationDataRequest } from '../../../../admin/bank-reconciliation/types/bank-reconciliation';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ReconciliationDataRequest = await request.json();
    const { startDate, endDate, accountNumber } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const response = await fetchReconciliationData(startDate, endDate, accountNumber);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Bank reconciliation data error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
