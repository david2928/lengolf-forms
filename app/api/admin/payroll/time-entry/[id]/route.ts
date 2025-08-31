import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { updateTimeEntry, validateTimeEntryUpdate, type TimeEntryUpdate } from '@/lib/payroll-review';

// PUT /api/admin/payroll/time-entry/[id] - Update a specific time entry
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const entryId = parseInt(id);
    
    if (isNaN(entryId)) {
      return NextResponse.json({ 
        error: 'Invalid entry ID. Must be a number.' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const updates: TimeEntryUpdate = {
      entry_id: entryId,
      clock_in_time: body.clock_in_time,
      clock_out_time: body.clock_out_time,
      notes: body.notes
    };

    console.log(`Updating time entry ${entryId}:`, updates);

    // Validate the update
    const validation = validateTimeEntryUpdate(updates);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    // Update the time entry
    const result = await updateTimeEntry(entryId, updates, session.user.email);
    
    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to update time entry',
        details: result.error
      }, { status: 500 });
    }

    console.log(`Time entry ${entryId} updated successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Time entry updated successfully',
      entry_id: entryId,
      updated_by: session.user.email,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json({ 
      error: 'Failed to update time entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}