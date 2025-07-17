import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current week boundaries (Monday to Sunday)
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday of current week
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Get previous week boundaries
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const previousWeekEnd = new Date(currentWeekEnd);
    previousWeekEnd.setDate(currentWeekEnd.getDate() - 7);

    console.log('Week boundaries:', {
      currentWeek: { start: currentWeekStart.toISOString(), end: currentWeekEnd.toISOString() },
      previousWeek: { start: previousWeekStart.toISOString(), end: previousWeekEnd.toISOString() }
    });

    // Get all active competitors with their social accounts
    const { data: competitors, error: competitorsError } = await supabaseAdmin
      .schema('marketing')
      .from('competitors')
      .select(`
        id,
        name,
        social_accounts:competitor_social_accounts(
          id,
          platform
        )
      `)
      .eq('is_active', true);

    if (competitorsError) {
      throw competitorsError;
    }

    const comparisons = [];

    // Process each competitor and platform
    for (const competitor of competitors || []) {
      for (const account of competitor.social_accounts || []) {
        try {
          // Get current week metrics (latest entry in the current week)
          const { data: currentWeekMetrics, error: currentError } = await supabaseAdmin
            .schema('marketing')
            .from('competitor_metrics')
            .select('*')
            .eq('competitor_id', competitor.id)
            .eq('platform', account.platform)
            .gte('recorded_at', currentWeekStart.toISOString())
            .lte('recorded_at', currentWeekEnd.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (currentError) {
            console.error(`Error fetching current week metrics for ${competitor.name} - ${account.platform}:`, currentError);
            continue;
          }

          // Get previous week metrics (latest entry in the previous week)
          const { data: previousWeekMetrics, error: previousError } = await supabaseAdmin
            .schema('marketing')
            .from('competitor_metrics')
            .select('*')
            .eq('competitor_id', competitor.id)
            .eq('platform', account.platform)
            .gte('recorded_at', previousWeekStart.toISOString())
            .lte('recorded_at', previousWeekEnd.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (previousError) {
            console.error(`Error fetching previous week metrics for ${competitor.name} - ${account.platform}:`, previousError);
            continue;
          }

          // Only include if we have at least one week of data
          if (currentWeekMetrics?.length > 0 || previousWeekMetrics?.length > 0) {
            comparisons.push({
              competitor_id: competitor.id,
              competitor_name: competitor.name,
              platform: account.platform,
              current_week: currentWeekMetrics?.[0] || null,
              previous_week: previousWeekMetrics?.[0] || null
            });
          }
        } catch (error) {
          console.error(`Error processing ${competitor.name} - ${account.platform}:`, error);
          continue;
        }
      }
    }

    // Sort by competitor name and platform for consistent ordering
    comparisons.sort((a, b) => {
      const nameCompare = a.competitor_name.localeCompare(b.competitor_name);
      if (nameCompare !== 0) return nameCompare;
      return a.platform.localeCompare(b.platform);
    });

    return NextResponse.json({
      success: true,
      comparisons,
      week_boundaries: {
        current_week: { start: currentWeekStart.toISOString(), end: currentWeekEnd.toISOString() },
        previous_week: { start: previousWeekStart.toISOString(), end: previousWeekEnd.toISOString() }
      }
    });

  } catch (error: any) {
    console.error('Weekly comparison error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch weekly comparison data',
      message: error.message
    }, { status: 500 });
  }
}