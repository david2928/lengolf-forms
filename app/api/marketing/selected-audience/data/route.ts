/**
 * Selected Audience Data API
 * Returns customer data for the currently selected audience
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/marketing/selected-audience/data - Get customer data for selected audience
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the selected audience ID from database
    const { data: selectedData, error: selectedError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('selected_audience')
      .select('audience_id')
      .eq('user_email', session.user.email)
      .single();

    if (selectedError && selectedError.code !== 'PGRST116') {
      throw selectedError;
    }

    const selectedAudienceId = selectedData?.audience_id || null;
    console.log('GET selected audience data for user', session.user.email, 'ID:', selectedAudienceId);
    
    if (!selectedAudienceId) {
      console.log('No audience selected, returning empty array');
      return NextResponse.json({
        customers: [],
        message: "No audience selected"
      });
    }

    // Get audience details with filters
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select('*')
      .eq('id', selectedAudienceId)
      .single();

    if (audienceError) throw audienceError;
    if (!audience) {
      return NextResponse.json({ error: "Selected audience not found" }, { status: 404 });
    }

    // Extract sort preferences from audience definition
    const audienceFilters = audience.definition_json?.filters || {};
    const sortBy = audienceFilters.sortBy || 'lastVisit';
    const sortOrder = audienceFilters.sortOrder || 'desc';

    // Get audience members with customer details
    const { data: members, error: membersError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audience_members')
      .select(`
        customer_id,
        added_at
      `)
      .eq('audience_id', selectedAudienceId);

    if (membersError) throw membersError;

    // Get customer details from the analytics view
    // For OB Sales, we only need a manageable number of customers (limit to 100)
    let customers = [];
    if (members && members.length > 0) {
      const customerIds = members.map(m => m.customer_id);
      console.log('Total audience members:', customerIds.length);
      console.log('Looking up customer IDs (first 3):', customerIds.slice(0, 3)); // Log first 3 IDs
      
      // Batch the customer lookup to avoid URI too large errors
      // For OB sales workflow, limit to top 100 customers by lifetime value
      const batchSize = 100;
      const limitedCustomerIds = customerIds.slice(0, batchSize);
      
      // Map sortBy to database column names
      const sortColumnMap: Record<string, string> = {
        'lastVisit': 'last_visit_date',
        'lastContacted': 'last_contacted',
        'lifetimeValue': 'lifetime_spending',
        'totalBookings': 'total_bookings',
        'name': 'customer_name'
      };
      
      const dbSortColumn = sortColumnMap[sortBy] || 'last_visit_date';
      const ascending = sortOrder === 'asc';
      
      console.log('Applying sort:', { sortBy, sortOrder, dbSortColumn, ascending });
      
      const { data: customerData, error: customerError } = await refacSupabaseAdmin
        .schema('public')
        .from('customer_analytics')
        .select('*')
        .in('id', limitedCustomerIds)
        .order(dbSortColumn, { ascending });

      if (customerError) {
        console.error('Customer lookup error:', customerError);
        throw customerError;
      }
      
      if (customerData) {
        customers = customerData;
        console.log('Found customers:', customers.length, 'out of', customerIds.length, 'total members');
      } else {
        console.log('No customer data returned');
      }
    }

    return NextResponse.json({
      audienceId: selectedAudienceId,
      audienceName: audience.name,
      customers: customers,
      totalCustomers: customers.length,
      filters: audience.definition_json?.filters || {},
      sortBy: sortBy,
      sortOrder: sortOrder,
      createdAt: audience.created_at
    });

  } catch (error: any) {
    console.error('Error fetching selected audience data:', error);
    return NextResponse.json(
      { error: "Failed to fetch audience data", details: error.message },
      { status: 500 }
    );
  }
}