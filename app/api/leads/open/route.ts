/**
 * Lead Open API
 * Records when a staff member opens a lead and calculates speed-to-lead metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

interface OpenLeadRequest {
  lead_id: string;
}

interface OpenLeadResponse {
  success: boolean;
  speed_to_lead_seconds: number;
  speed_to_lead_formatted: string;
  business_hours_start: string;
  opened_at: string;
  lead_details: any;
}

// Helper function to format speed to lead
function formatSpeedToLead(seconds: number): string {
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
}

// POST /api/leads/open - Open a lead and record metrics
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: OpenLeadRequest = await request.json();
    
    // Validate required fields
    if (!body.lead_id) {
      return NextResponse.json(
        { error: 'Missing required field: lead_id' },
        { status: 400 }
      );
    }

    const supabase = refacSupabaseAdmin;

    // Check if lead was already opened
    const { data: existingOpen } = await supabase
      .from('lead_opens')
      .select('id')
      .eq('lead_id', body.lead_id)
      .single();

    if (existingOpen) {
      return NextResponse.json(
        { error: 'Lead has already been opened' },
        { status: 409 }
      );
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('processed_leads')
      .select(`
        id,
        full_name,
        phone_number,
        email,
        meta_submitted_at,
        form_type,
        group_size,
        preferred_time,
        planned_visit,
        additional_inquiries
      `)
      .eq('id', body.lead_id)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Calculate business hours start time using the database function
    const { data: businessHoursData, error: businessHoursError } = await supabase
      .rpc('calculate_business_hours_start', {
        lead_timestamp: lead.meta_submitted_at
      });

    if (businessHoursError) {
      console.error('Error calculating business hours:', businessHoursError);
      return NextResponse.json(
        { error: 'Failed to calculate business hours' },
        { status: 500 }
      );
    }

    const businessHoursStart = new Date(businessHoursData);
    const openedAt = new Date();
    const speedToLeadSeconds = Math.max(0, Math.floor((openedAt.getTime() - businessHoursStart.getTime()) / 1000));

    // Record the lead open event
    const { data: openData, error: openError } = await supabase
      .from('lead_opens')
      .insert({
        lead_id: body.lead_id,
        opened_by: session.user.email,
        opened_at: openedAt.toISOString(),
        business_hours_start: businessHoursStart.toISOString(),
        speed_to_lead_seconds: speedToLeadSeconds
      })
      .select()
      .single();

    if (openError) {
      console.error('Error recording lead open:', openError);
      return NextResponse.json(
        { error: 'Failed to record lead open' },
        { status: 500 }
      );
    }

    console.log(`Lead ${body.lead_id} opened by ${session.user.email} with speed-to-lead: ${formatSpeedToLead(speedToLeadSeconds)}`);

    // Return success with lead details and metrics
    return NextResponse.json({
      success: true,
      speed_to_lead_seconds: speedToLeadSeconds,
      speed_to_lead_formatted: formatSpeedToLead(speedToLeadSeconds),
      business_hours_start: businessHoursStart.toISOString(),
      opened_at: openedAt.toISOString(),
      lead_details: {
        ...lead,
        display_name: `${lead.full_name} (${lead.phone_number})`
      }
    });

  } catch (error: any) {
    console.error('Lead Open API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}