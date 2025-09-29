import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
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

    // Fetch debug messages and settings
    const [messagesResult, settingsResult] = await Promise.all([
      refacSupabaseAdmin
        .from('line_group_debug')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      refacSupabaseAdmin
        .from('line_group_debug_settings')
        .select('enabled')
        .single()
    ]);

    if (messagesResult.error) {
      console.error('Error fetching LINE group debug messages:', messagesResult.error);
      return NextResponse.json({
        success: false,
        error: messagesResult.error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages: messagesResult.data || [],
      count: messagesResult.data?.length || 0,
      debugEnabled: settingsResult.data?.enabled || false
    });

  } catch (error) {
    console.error('Error in LINE group debug API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Clear all debug messages
    const { error } = await refacSupabaseAdmin
      .from('line_group_debug')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error clearing LINE group debug messages:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'All debug messages cleared'
    });

  } catch (error) {
    console.error('Error clearing LINE group debug messages:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}