import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

interface MatchResult {
  usage_id: string;
  package_id: string;
  used_date: string;
  used_hours: number;
  employee_name: string;
  booking_id: string | null;
  booking_date?: string;
  booking_time?: string;
  booking_duration?: number;
  customer_name?: string;
  match_confidence: 'exact' | 'customer' | 'proximity' | null;
  match_reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you may want to add this check to your allowed_users table)
    // For now, we'll allow any authenticated user

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry_run') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    console.log(`Starting booking matching process (dry_run: ${dryRun})`);

    // Get unmatched package usage records
    const { data: unmatchedUsage, error: usageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .select(`
        id,
        package_id,
        used_date,
        used_hours,
        employee_name,
        packages!inner(customer_id, customer_name)
      `)
      .is('booking_id', null)
      .limit(limit);

    if (usageError) {
      console.error('Error fetching unmatched usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage records' },
        { status: 500 }
      );
    }

    const matchResults: MatchResult[] = [];
    const statistics = {
      total_processed: 0,
      exact_matches: 0,
      customer_matches: 0,
      no_matches: 0,
      multiple_matches: 0
    };

    // Process each usage record
    for (const usage of unmatchedUsage || []) {
      statistics.total_processed++;
      
      // Phase 1: Try exact match (package_id + date + confirmed)
      const { data: exactMatches } = await refacSupabaseAdmin
        .from('bookings')
        .select('id, date, start_time, duration, name, status')
        .eq('package_id', usage.package_id)
        .eq('date', usage.used_date)
        .eq('status', 'confirmed')
        .is('booking_id', null); // Don't match already linked bookings

      if (exactMatches && exactMatches.length > 0) {
        // Sort by priority: confirmed status, earliest time
        const bestMatch = exactMatches.sort((a: any, b: any) => {
          if (a.status !== b.status) {
            return a.status === 'confirmed' ? -1 : 1;
          }
          return a.start_time.localeCompare(b.start_time);
        })[0];

        matchResults.push({
          usage_id: usage.id,
          package_id: usage.package_id,
          used_date: usage.used_date,
          used_hours: usage.used_hours,
          employee_name: usage.employee_name,
          booking_id: bestMatch.id,
          booking_date: bestMatch.date,
          booking_time: bestMatch.start_time,
          booking_duration: bestMatch.duration,
          customer_name: bestMatch.name,
          match_confidence: 'exact',
          match_reason: `Exact match: package ${usage.package_id.slice(0, 8)}... on ${usage.used_date}`
        });

        statistics.exact_matches++;
        if (exactMatches.length > 1) {
          statistics.multiple_matches++;
        }
        continue;
      }

      // Phase 2: Try customer + date match
      const { data: customerMatches } = await refacSupabaseAdmin
        .from('bookings')
        .select('id, date, start_time, duration, name, package_id, status')
        .eq('customer_id', usage.packages.customer_id)
        .eq('date', usage.used_date)
        .eq('status', 'confirmed')
        .is('booking_id', null);

      if (customerMatches && customerMatches.length > 0) {
        // Prefer bookings with package info, then by time
        const bestMatch = customerMatches.sort((a: any, b: any) => {
          if ((a.package_id !== null) !== (b.package_id !== null)) {
            return a.package_id !== null ? -1 : 1;
          }
          return a.start_time.localeCompare(b.start_time);
        })[0];

        matchResults.push({
          usage_id: usage.id,
          package_id: usage.package_id,
          used_date: usage.used_date,
          used_hours: usage.used_hours,
          employee_name: usage.employee_name,
          booking_id: bestMatch.id,
          booking_date: bestMatch.date,
          booking_time: bestMatch.start_time,
          booking_duration: bestMatch.duration,
          customer_name: bestMatch.name,
          match_confidence: 'customer',
          match_reason: `Customer match: ${usage.packages.customer_name} on ${usage.used_date}`
        });

        statistics.customer_matches++;
        if (customerMatches.length > 1) {
          statistics.multiple_matches++;
        }
        continue;
      }

      // No match found
      matchResults.push({
        usage_id: usage.id,
        package_id: usage.package_id,
        used_date: usage.used_date,
        used_hours: usage.used_hours,
        employee_name: usage.employee_name,
        booking_id: null,
        customer_name: usage.packages.customer_name,
        match_confidence: null,
        match_reason: `No booking found for ${usage.packages.customer_name} on ${usage.used_date}`
      });

      statistics.no_matches++;
    }

    // Apply matches if not dry run
    let applied_matches = 0;
    if (!dryRun && matchResults.length > 0) {
      const matchesToApply = matchResults.filter(r => r.booking_id !== null);

      for (const match of matchesToApply) {
        const { error } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('package_usage')
          .update({
            booking_id: match.booking_id,
            match_confidence: match.match_confidence
          })
          .eq('id', match.usage_id);

        if (!error) {
          applied_matches++;
        } else {
          console.error(`Failed to apply match for usage ${match.usage_id}:`, error);
        }
      }
    }

    console.log('Matching completed:', {
      ...statistics,
      applied_matches: dryRun ? 'N/A (dry run)' : applied_matches
    });

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      statistics,
      applied_matches: dryRun ? null : applied_matches,
      matches: matchResults,
      summary: {
        message: dryRun 
          ? `Found ${matchResults.filter(r => r.booking_id).length} potential matches out of ${statistics.total_processed} usage records`
          : `Applied ${applied_matches} matches out of ${matchResults.filter(r => r.booking_id).length} potential matches`
      }
    });

  } catch (error: any) {
    console.error('Error in booking matching API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}