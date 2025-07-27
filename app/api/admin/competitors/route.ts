import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getRefacSupabaseClient } from '@/lib/refac-supabase';
import { Competitor, CompetitorWithAccounts } from '@/types/competitor-tracking';

// GET /api/admin/competitors - List all competitors with latest metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = getRefacSupabaseClient();

    // Get competitors with their social accounts and latest metrics
    const { data: competitors, error } = await supabase
      .schema('marketing')
      .from('competitors')
      .select(`
        *,
        social_accounts:competitor_social_accounts(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching competitors:', error);
      return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
    }

    // Get latest metrics for each competitor
    const competitorsWithMetrics = await Promise.all(
      competitors.map(async (competitor: any) => {
        const { data: metrics } = await supabase
          .schema('marketing')
          .from('competitor_latest_metrics')
          .select('*')
          .eq('competitor_id', competitor.id);

        return {
          ...competitor,
          latest_metrics: metrics || []
        };
      })
    );

    return NextResponse.json({ competitors: competitorsWithMetrics });
  } catch (error) {
    console.error('Error in GET /api/admin/competitors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/competitors - Create new competitor
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, business_type, location, notes, social_accounts } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getRefacSupabaseClient();

    // Start a transaction by creating competitor first
    const { data: competitor, error: competitorError } = await supabase
      .schema('marketing')
      .from('competitors')
      .insert({
        name,
        business_type: business_type || 'golf_academy',
        location,
        notes,
        created_by: session.user.email
      })
      .select()
      .single();

    if (competitorError) {
      console.error('Error creating competitor:', competitorError);
      return NextResponse.json({ 
        error: competitorError.message || 'Failed to create competitor' 
      }, { status: 500 });
    }

    // Add social accounts if provided
    if (social_accounts && social_accounts.length > 0) {
      const accountsToInsert = social_accounts.map((account: any) => ({
        competitor_id: competitor.id,
        platform: account.platform,
        account_handle: account.account_handle,
        account_url: account.account_url
      }));

      const { error: accountsError } = await supabase
        .schema('marketing')
        .from('competitor_social_accounts')
        .insert(accountsToInsert);

      if (accountsError) {
        console.error('Error creating social accounts:', accountsError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Fetch the complete competitor with accounts
    const { data: completeCompetitor } = await supabase
      .schema('marketing')
      .from('competitors')
      .select(`
        *,
        social_accounts:competitor_social_accounts(*)
      `)
      .eq('id', competitor.id)
      .single();

    return NextResponse.json({ 
      competitor: completeCompetitor,
      message: 'Competitor created successfully' 
    });
  } catch (error) {
    console.error('Error in POST /api/admin/competitors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}