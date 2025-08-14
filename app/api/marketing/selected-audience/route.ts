/**
 * Selected Audience API for OB Sales workflow
 * Stores the currently selected audience for use in lead-feedback page
 * Uses database storage instead of in-memory for persistence across requests
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/marketing/selected-audience - Get current selected audience
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get selected audience from database
    const { data, error } = await refacSupabaseAdmin
      .schema('marketing')
      .from('selected_audience')
      .select('audience_id')
      .eq('user_email', session.user.email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    const selectedId = data?.audience_id || null;
    console.log('GET selected audience ID for', session.user.email, ':', selectedId);
    
    return NextResponse.json({
      selectedAudienceId: selectedId
    });
  } catch (error: any) {
    console.error('Error getting selected audience:', error);
    return NextResponse.json(
      { error: "Failed to get selected audience", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/marketing/selected-audience - Set selected audience
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { audienceId } = body;

    // Validate audienceId is either null or a number
    if (audienceId !== null && typeof audienceId !== 'number') {
      return NextResponse.json(
        { error: "Invalid audienceId. Must be a number or null." },
        { status: 400 }
      );
    }

    if (audienceId === null) {
      // Delete selection
      await refacSupabaseAdmin
        .schema('marketing')
        .from('selected_audience')
        .delete()
        .eq('user_email', session.user.email);
    } else {
      // Upsert selection
      await refacSupabaseAdmin
        .schema('marketing')
        .from('selected_audience')
        .upsert({
          user_email: session.user.email,
          audience_id: audienceId,
          selected_at: new Date().toISOString()
        }, {
          onConflict: 'user_email'
        });
    }

    console.log('SET selected audience ID for', session.user.email, ':', audienceId);

    return NextResponse.json({
      success: true,
      selectedAudienceId: audienceId,
      message: audienceId ? "Audience selected for OB Sales" : "Audience selection cleared"
    });

  } catch (error: any) {
    console.error('Error setting selected audience:', error);
    return NextResponse.json(
      { error: "Failed to set selected audience", details: error.message },
      { status: 500 }
    );
  }
}