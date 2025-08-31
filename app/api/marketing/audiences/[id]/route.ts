/**
 * Marketing Audience Management API - Individual Audience Operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/marketing/audiences/[id] - Get specific audience with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const audienceId = id;

    // Get audience details
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select('*')
      .eq('id', audienceId)
      .single();

    if (audienceError) throw audienceError;
    if (!audience) {
      return NextResponse.json({ error: "Audience not found" }, { status: 404 });
    }

    // Get audience members with customer details
    const { data: members, error: membersError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audience_members')
      .select(`
        customer_id,
        added_at
      `)
      .eq('audience_id', audienceId);

    if (membersError) throw membersError;

    // Get customer details from the analytics view
    let customers = [];
    if (members && members.length > 0) {
      const customerIds = members.map((m: any) => m.customer_id);
      const { data: customerData, error: customerError } = await refacSupabaseAdmin
        .from('customer_analytics')
        .select('*')
        .in('id', customerIds);

      if (!customerError) {
        customers = customerData || [];
      }
    }

    return NextResponse.json({
      id: audience.id,
      name: audience.name,
      filters: audience.definition_json?.filters || {},
      customer_count: customers.length,
      customers,
      created_at: audience.created_at,
      created_by_staff_id: audience.created_by_staff_id
    });

  } catch (error: any) {
    console.error('Error fetching marketing audience:', error);
    return NextResponse.json(
      { error: "Failed to fetch audience", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/audiences/[id] - Delete audience
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const audienceId = parseInt(id);

    // Delete audience members first (foreign key constraint)
    const { error: membersError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audience_members')
      .delete()
      .eq('audience_id', audienceId);

    if (membersError) throw membersError;

    // Delete audience
    const { error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .delete()
      .eq('id', audienceId);

    if (audienceError) throw audienceError;

    return NextResponse.json({
      message: "Audience deleted successfully"
    });

  } catch (error: any) {
    console.error('Error deleting marketing audience:', error);
    return NextResponse.json(
      { error: "Failed to delete audience", details: error.message },
      { status: 500 }
    );
  }
}