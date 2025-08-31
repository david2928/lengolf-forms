import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { getReviewEntries } from '@/lib/payroll-review';

// GET /api/admin/payroll/[month]/review-entries - Returns flagged time entries for review
export async function GET(request: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month } = await params;
    
    // Validate month format (should be YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json({ 
        error: 'Invalid month format. Use YYYY-MM format (e.g., 2024-06)' 
      }, { status: 400 });
    }

    console.log(`Getting review entries for month: ${month}`);
    
    // Get entries that need review
    const reviewEntries = await getReviewEntries(month);
    
    // Group entries by review criteria for better UI display
    const summary = {
      total_entries: reviewEntries.length,
      missing_clockouts: reviewEntries.filter(e => e.has_missing_clockout).length,
      short_shifts: reviewEntries.filter(e => e.note === 'Short duration shift').length,
      long_shifts: reviewEntries.filter(e => e.note === 'Long duration shift').length,
      short_sessions: reviewEntries.filter(e => e.note === 'Short session').length,
      long_sessions: reviewEntries.filter(e => e.note === 'Long session').length,
      by_staff: reviewEntries.reduce((acc, entry) => {
        acc[entry.staff_name] = (acc[entry.staff_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    const response = {
      month,
      summary,
      entries: reviewEntries.map(entry => ({
        ...entry,
        // Format timestamps for better display
        clock_in_time_formatted: entry.clock_in_time ? 
          new Date(entry.clock_in_time).toLocaleString('en-US', { 
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }) : null,
        clock_out_time_formatted: entry.clock_out_time ? 
          new Date(entry.clock_out_time).toLocaleString('en-US', { 
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }) : null,
        date_formatted: new Date(entry.date).toLocaleDateString('en-US', {
          timeZone: 'Asia/Bangkok',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })),
      generated_at: new Date().toISOString()
    };

    console.log(`Found ${reviewEntries.length} entries requiring review`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting review entries:', error);
    return NextResponse.json({ 
      error: 'Failed to get review entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 