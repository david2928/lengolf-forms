import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

// GET /api/admin/payroll/months - Returns current month and last 2 months for payroll processing
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date in Bangkok timezone
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    // Generate current month and last 2 months (3 months total)
    const months = [];
    const currentYear = bangkokTime.getFullYear();
    const currentMonth = bangkokTime.getMonth(); // 0-based (0 = January)
    
    for (let i = 0; i <= 2; i++) {
      const targetMonth = currentMonth - i;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12; // Handle negative months
      
      const targetDate = new Date(targetYear, adjustedMonth, 1);
      
      const monthYear = `${targetYear}-${String(adjustedMonth + 1).padStart(2, '0')}`; // Format: "2025-08"
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