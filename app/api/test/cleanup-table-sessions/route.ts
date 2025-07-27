import { NextRequest, NextResponse } from "next/server";
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

/**
 * Test cleanup endpoint - only available in development
 * DELETE /api/test/cleanup-table-sessions
 */
export async function DELETE(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Test cleanup endpoints only available in development" },
      { status: 403 }
    );
  }

  try {
    // First get the count of active sessions
    const { data: activeSessions, error: countError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('id')
      .is('session_end', null);

    if (countError) {
      console.error('Error counting active sessions:', countError);
      return NextResponse.json(
        { error: "Failed to count active sessions" },
        { status: 500 }
      );
    }

    const sessionCount = activeSessions?.length || 0;
    console.log(`🧹 Found ${sessionCount} active table sessions to clean up`);

    if (sessionCount === 0) {
      return NextResponse.json({
        success: true,
        message: "No active table sessions to clean up",
        deletedCount: 0
      });
    }

    // Delete all active table sessions
    const { error } = await supabase
      .schema('pos')
      .from('table_sessions')
      .delete()
      .is('session_end', null);

    if (error) {
      console.error('Error cleaning up table sessions:', error);
      return NextResponse.json(
        { error: "Failed to cleanup table sessions" },
        { status: 500 }
      );
    }

    console.log(`🧹 Test cleanup: Successfully deleted ${sessionCount} active table sessions`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${sessionCount} active table sessions`,
      deletedCount: sessionCount
    });

  } catch (error) {
    console.error('Error in test cleanup:', error);
    return NextResponse.json(
      { error: "Internal server error during cleanup" },
      { status: 500 }
    );
  }
}