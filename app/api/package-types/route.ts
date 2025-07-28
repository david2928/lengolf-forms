import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch package types
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_types')
      .select('id, name, display_order, type')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching package types:', error);
      return NextResponse.json({ 
        error: "Failed to fetch package types",
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Package types API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}