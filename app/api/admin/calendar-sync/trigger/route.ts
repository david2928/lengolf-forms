import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST() {
  // Verify admin access
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // In a production environment, you'd want to check if the user is an admin
  // For now, any authenticated user can trigger the sync for testing
  
  try {
    console.log('📞 Manual calendar sync triggered by:', session.user.email);
    
    // Call the calendar sync endpoint
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/calendar-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!syncResponse.ok) {
      throw new Error(`Calendar sync API returned ${syncResponse.status}: ${syncResponse.statusText}`);
    }

    const syncResult = await syncResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Calendar sync manually triggered successfully',
      triggered_by: session.user.email,
      sync_result: syncResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual calendar sync trigger failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger calendar sync',
      details: error instanceof Error ? error.message : 'Unknown error',
      triggered_by: session.user.email,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Calendar Sync Manual Trigger',
    description: 'POST to this endpoint to manually trigger calendar synchronization',
    requires: 'Authentication',
    note: 'This endpoint calls the main calendar sync service manually'
  });
} 