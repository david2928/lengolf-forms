/**
 * OB Sales Call Notes API
 * Saves and retrieves call notes for outbound sales calls
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

interface OBSalesNote {
  customer_id: string;
  reachable: boolean;
  response?: string;
  timeline?: string;
  follow_up_required: boolean;
  booking_submitted: boolean;
  notes: string;
  call_date: string;
  staff_email: string;
}

// POST /api/marketing/ob-sales-notes - Save call notes
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: OBSalesNote = await request.json();
    
    // Validate required fields
    if (!body.customer_id || typeof body.reachable !== 'boolean' || !body.notes?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: customer_id, reachable, notes" },
        { status: 400 }
      );
    }

    // Insert call note
    const { data, error } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .insert({
        customer_id: body.customer_id,
        reachable: body.reachable,
        response: body.response || null,
        timeline: body.timeline || null,
        follow_up_required: body.follow_up_required || false,
        booking_submitted: body.booking_submitted || false,
        notes: body.notes.trim(),
        call_date: body.call_date || new Date().toISOString().split('T')[0],
        staff_email: session.user.email,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving OB sales note:', error);
      return NextResponse.json(
        { error: "Failed to save call notes" },
        { status: 500 }
      );
    }

    // Update last_contacted for the customer
    await refacSupabaseAdmin
      .schema('public')
      .from('customer_analytics')
      .update({ last_contacted: new Date().toISOString() })
      .eq('id', body.customer_id);

    console.log(`OB Sales note saved for customer ${body.customer_id} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('OB Sales Notes API Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET /api/marketing/ob-sales-notes - Get call notes for a customer
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id');
    const audience_id = searchParams.get('audience_id');
    const follow_up_required = searchParams.get('follow_up_required');

    if (!customer_id && !audience_id) {
      return NextResponse.json(
        { error: "customer_id or audience_id parameter required" },
        { status: 400 }
      );
    }

    let query = refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply follow-up filter if specified
    if (follow_up_required === 'true') {
      query = query.eq('follow_up_required', true);
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    } else if (audience_id) {
      // Use a more efficient approach to avoid URI too large errors
      // Instead of IN() with potentially thousands of customer IDs,
      // we'll use a different strategy based on the size of the audience
      
      // First check audience size
      const { data: audienceInfo, error: audienceError } = await refacSupabaseAdmin
        .schema('marketing')
        .from('audience_members')
        .select('customer_id', { count: 'exact' })
        .eq('audience_id', audience_id)
        .limit(1000); // Limit to get a sense of size

      if (audienceError) {
        console.error('Error checking audience size:', audienceError);
        throw audienceError;
      }

      const audienceSize = audienceInfo?.length || 0;
      console.log(`Audience ${audience_id} has ${audienceSize} members`);
      
      if (audienceSize > 500) {
        // For large audiences, use a simple RPC function to avoid URI length issues
        const { data, error } = await refacSupabaseAdmin.rpc('get_ob_sales_notes_simple', {
          p_audience_id: audience_id,
          p_follow_up_required: follow_up_required === 'true',
          p_limit: 200
        });
        
        if (error) {
          console.error('Error using simple RPC for large audience:', error);
          // Fallback: get a subset of the most recent notes using limited customer IDs
          console.log('Falling back to limited subset...');
          const recentCustomers = audienceInfo.slice(0, 100).map((m: any) => m.customer_id);
          query = query.in('customer_id', recentCustomers);
        } else {
          // Transform the simple data to include customer details
          const enrichedData = [];
          for (const note of (data || [])) {
            // Get customer details separately
            const { data: customerData } = await refacSupabaseAdmin
              .schema('public')
              .from('customer_marketing_analytics')
              .select('customer_name, contact_number')
              .eq('id', note.customer_id)
              .single();
            
            enrichedData.push({
              ...note,
              customer_name: customerData?.customer_name || 'Unknown Customer',
              customer_phone: customerData?.contact_number || null
            });
          }
          
          return NextResponse.json({
            success: true,
            data: enrichedData
          });
        }
      } else {
        // For smaller audiences, use the original approach
        const customerIds = audienceInfo.map((m: any) => m.customer_id);
        if (customerIds.length > 0) {
          query = query.in('customer_id', customerIds);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching OB sales notes:', error);
      return NextResponse.json(
        { error: "Failed to fetch call notes" },
        { status: 500 }
      );
    }

    // Transform data for follow-up view - get customer details separately
    const transformedData = [];
    if (data && data.length > 0) {
      // Get customer details in batch
      const customerIds = data.map((note: any) => note.customer_id);
      const { data: customers } = await refacSupabaseAdmin
        .schema('public')
        .from('customer_marketing_analytics')
        .select('id, customer_name, contact_number')
        .in('id', customerIds);

      // Create a customer lookup map
      const customerMap = new Map();
      if (customers) {
        customers.forEach((customer: any) => {
          customerMap.set(customer.id, customer);
        });
      }

      // Transform the data with customer details
      for (const note of data) {
        const customer = customerMap.get(note.customer_id);
        transformedData.push({
          ...note,
          customer_name: customer?.customer_name || 'Unknown Customer',
          customer_phone: customer?.contact_number || null
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error: any) {
    console.error('OB Sales Notes GET API Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}