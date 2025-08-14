/**
 * Dashboard Statistics API
 * Returns real-time statistics for the lead feedback dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month

    // Helper function to format speed to lead
    const formatSpeedToLead = (seconds: number): string => {
      if (!seconds || seconds <= 0) return '0m';
      const hours = seconds / 3600;
      if (hours < 1) {
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
      } else if (hours < 24) {
        return `${hours.toFixed(1)}h`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return `${days}d ${remainingHours}h`;
      }
    };

    // Get Speed-to-Lead metrics (from lead_opens table, excluding follow-ups)
    
    // Today's speed to lead
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayOpens, error: todayError } = await refacSupabaseAdmin
      .from('lead_opens')
      .select('speed_to_lead_seconds')
      .gte('opened_at', todayStart.toISOString())
      .lte('opened_at', todayEnd.toISOString());

    // This week's speed to lead
    const { data: weekOpens, error: weekError } = await refacSupabaseAdmin
      .from('lead_opens')
      .select('speed_to_lead_seconds')
      .gte('opened_at', thisWeekStart.toISOString())
      .lte('opened_at', today.toISOString());

    // This month's speed to lead
    const { data: monthOpens, error: monthError } = await refacSupabaseAdmin
      .from('lead_opens')
      .select('speed_to_lead_seconds')
      .gte('opened_at', thisMonthStart.toISOString())
      .lte('opened_at', today.toISOString());

    // Calculate averages
    const calculateAverage = (data: any[]): { average_seconds: number; count: number; formatted: string } => {
      if (!data || data.length === 0) {
        return { average_seconds: 0, count: 0, formatted: '0m' };
      }
      const total = data.reduce((sum, item) => sum + (item.speed_to_lead_seconds || 0), 0);
      const average = total / data.length;
      return {
        average_seconds: Math.round(average),
        count: data.length,
        formatted: formatSpeedToLead(average)
      };
    };

    const todaySpeedStats = calculateAverage(todayOpens || []);
    const weekSpeedStats = calculateAverage(weekOpens || []);
    const monthSpeedStats = calculateAverage(monthOpens || []);

    // Get OB Calls count (total log button clicks this week)
    const { data: obCallsData, error: obCallsError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    if (obCallsError) {
      console.error('Error fetching OB calls:', obCallsError);
    }

    // Get Sales count (log and create booking clicks this week)
    const { data: salesData, error: salesError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .eq('booking_submitted', true)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    if (salesError) {
      console.error('Error fetching sales:', salesError);
    }

    const stats = {
      speedToLead: todaySpeedStats.formatted,
      weekAverage: weekSpeedStats.formatted, 
      monthAverage: monthSpeedStats.formatted,
      obCalls: obCallsData?.length || 0,
      sales: salesData?.length || 0
    };

    return NextResponse.json({
      success: true,
      stats,
      speedToLeadDetails: {
        today: todaySpeedStats,
        week: weekSpeedStats,
        month: monthSpeedStats
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Dashboard Stats API Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}