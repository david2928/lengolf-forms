import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

// GET /api/admin/payroll/months - Returns last 3 months for payroll processing
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date in Bangkok timezone
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    // Generate last 3 months
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const targetDate = new Date(bangkokTime);
      targetDate.setMonth(targetDate.getMonth() - i);
      
      const monthYear = targetDate.toISOString().slice(0, 7); // Format: "2024-06"
      const monthName = targetDate.toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok'
      });
      
      months.push({
        month: monthYear,
        display: monthName,
        formatted: monthName
      });
    }

    return NextResponse.json({ months });

  } catch (error) {
    console.error('Error getting payroll months:', error);
    return NextResponse.json({ 
      error: 'Failed to get payroll months',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 