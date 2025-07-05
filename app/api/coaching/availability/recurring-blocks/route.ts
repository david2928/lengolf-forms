import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coach_id');

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Determine which coach's blocks to fetch
    let targetCoachId = currentUser.id;
    if (currentUser.is_admin && coachId) {
      targetCoachId = coachId;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch recurring blocks
    const { data: recurringBlocks, error } = await supabase
      .from('coach_recurring_blocks')
      .select('*')
      .eq('coach_id', targetCoachId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      console.error('Error fetching recurring blocks:', error);
      return NextResponse.json({ error: 'Failed to fetch recurring blocks' }, { status: 500 });
    }

    return NextResponse.json({
      recurringBlocks: recurringBlocks || [],
      coachId: targetCoachId
    });

  } catch (error) {
    console.error('Error in recurring blocks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { coachId, title, dayOfWeek, startTime, endTime } = body;

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check permissions
    let targetCoachId = currentUser.id;
    if (currentUser.is_admin && coachId) {
      targetCoachId = coachId;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    } else if (currentUser.is_coach && coachId && coachId !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own schedule' }, { status: 403 });
    }

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Start time and end time are required' }, { status: 400 });
    }


    // Create recurring block
    const { data, error } = await supabase
      .from('coach_recurring_blocks')
      .insert({
        coach_id: targetCoachId,
        title: title.trim(),
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recurring block:', error);
      return NextResponse.json({ error: 'Failed to create recurring block' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recurring block created successfully',
      block: data
    });

  } catch (error) {
    console.error('Error in recurring blocks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, dayOfWeek, startTime, endTime, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check if user can modify this block
    const { data: existingBlock, error: blockError } = await supabase
      .from('coach_recurring_blocks')
      .select('coach_id')
      .eq('id', id)
      .single();

    if (blockError || !existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (!currentUser.is_admin && existingBlock.coach_id !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own blocks' }, { status: 403 });
    }

    // Validate input
    const updateData: any = {};
    
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (dayOfWeek !== undefined) {
      if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 });
      }
      updateData.day_of_week = dayOfWeek;
    }

    if (startTime !== undefined) {
      updateData.start_time = startTime;
    }

    if (endTime !== undefined) {
      updateData.end_time = endTime;
    }


    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    updateData.updated_at = new Date().toISOString();

    // Update recurring block
    const { data, error } = await supabase
      .from('coach_recurring_blocks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recurring block:', error);
      return NextResponse.json({ error: 'Failed to update recurring block' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recurring block updated successfully',
      block: data
    });

  } catch (error) {
    console.error('Error in recurring blocks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check if user can delete this block
    const { data: existingBlock, error: blockError } = await supabase
      .from('coach_recurring_blocks')
      .select('coach_id')
      .eq('id', id)
      .single();

    if (blockError || !existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (!currentUser.is_admin && existingBlock.coach_id !== currentUser.id) {
      return NextResponse.json({ error: 'Can only delete your own blocks' }, { status: 403 });
    }

    // Delete recurring block
    const { error } = await supabase
      .from('coach_recurring_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recurring block:', error);
      return NextResponse.json({ error: 'Failed to delete recurring block' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recurring block deleted successfully'
    });

  } catch (error) {
    console.error('Error in recurring blocks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}