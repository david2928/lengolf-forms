/**
 * Marketing Audiences API
 * Manages customer audience snapshots for marketing campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface CreateAudienceRequest {
  name: string;
  filters: {
    lastVisitFrom?: string;
    lastVisitTo?: string;
    hasLine?: boolean;
    notVisitedDays?: number;
    hasPackage?: boolean;
    sortBy?: string;
    sortOrder?: string;
  };
  customers: Array<{
    id: string;
    customer_name: string;
    contact_number?: string;
    email?: string;
    lifetime_spending: number;
    last_visit_date?: string;
    preferred_contact_method?: string;
  }>;
}

// GET /api/marketing/audiences - List saved audiences
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get audiences from marketing schema
    const { data: audiences, error, count } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select(`
        id,
        name,
        definition_json,
        created_at,
        created_by_staff_id
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get customer counts for each audience
    const audiencesWithCounts = await Promise.all(
      (audiences || []).map(async (audience: any) => {
        const { count: memberCount } = await refacSupabaseAdmin
          .schema('marketing')
          .from('audience_members')
          .select('*', { count: 'exact', head: true })
          .eq('audience_id', audience.id);

        return {
          id: audience.id,
          name: audience.name,
          filters: audience.definition_json?.filters || {},
          customer_count: memberCount || 0,
          created_at: audience.created_at,
          created_by_staff_id: audience.created_by_staff_id
        };
      })
    );

    return NextResponse.json({
      audiences: audiencesWithCounts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_next: (count || 0) > offset + limit,
        has_prev: offset > 0
      }
    });

  } catch (error: any) {
    console.error('Error fetching marketing audiences:', error);
    return NextResponse.json(
      { error: "Failed to fetch audiences", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/marketing/audiences - Create new audience
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreateAudienceRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.customers || body.customers.length === 0) {
      return NextResponse.json(
        { error: "Name and customers are required" },
        { status: 400 }
      );
    }

    // Create audience record
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .insert({
        name: body.name,
        definition_json: {
          filters: body.filters,
          customer_count: body.customers.length,
          created_via: 'marketing_page'
        },
        created_by_staff_id: null // Would need to map email to staff ID
      })
      .select()
      .single();

    if (audienceError) throw audienceError;

    // Create audience member records
    const audienceMembers = body.customers.map(customer => ({
      audience_id: audience.id,
      customer_id: customer.id,
      added_at: new Date().toISOString()
    }));

    const { error: membersError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audience_members')
      .insert(audienceMembers);

    if (membersError) throw membersError;

    return NextResponse.json({
      audience: {
        id: audience.id,
        name: audience.name,
        filters: body.filters,
        customer_count: body.customers.length,
        created_at: audience.created_at
      },
      message: "Audience created successfully"
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating marketing audience:', error);
    return NextResponse.json(
      { error: "Failed to create audience", details: error.message },
      { status: 500 }
    );
  }
}