import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Invalid enabled value - must be boolean'
      }, { status: 400 });
    }

    // Update or insert the setting
    const { data, error } = await refacSupabaseAdmin
      .from('line_group_debug_settings')
      .upsert({
        enabled,
        updated_at: new Date().toISOString()
      })
      .select('enabled')
      .single();

    if (error) {
      console.error('Error updating LINE group debug setting:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      enabled: data.enabled,
      message: `Debug mode ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Error toggling LINE group debug mode:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}