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

    // Call the Supabase RPC function
    const { data, error } = await refacSupabaseAdmin.rpc('get_dashboard_calculations_documentation');
    
    if (error) {
      console.error('Error fetching calculations documentation:', error);
      return NextResponse.json({ 
        error: "Failed to fetch calculations documentation",
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Calculations documentation API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}