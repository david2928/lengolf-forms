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

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    } else if (audience_id) {
      // Get all notes for customers in this audience
      const { data: members } = await refacSupabaseAdmin
        .schema('marketing')
        .from('audience_members')
        .select('customer_id')
        .eq('audience_id', audience_id);
      
      if (members && members.length > 0) {
        const customerIds = members.map((m: any) => m.customer_id);
        query = query.in('customer_id', customerIds);
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

    return NextResponse.json({
      success: true,
      data: data || []
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