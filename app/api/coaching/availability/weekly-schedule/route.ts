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

    // Determine which coach's schedule to fetch
    let targetCoachId = currentUser.id;
    if (currentUser.is_admin && coachId) {
      targetCoachId = coachId;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch weekly schedule
    const { data: weeklySchedule, error } = await supabase
      .from('coach_weekly_schedules')
      .select('*')
      .eq('coach_id', targetCoachId)
      .order('day_of_week');

    if (error) {
      console.error('Error fetching weekly schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch weekly schedule' }, { status: 500 });
    }

    return NextResponse.json({
      weeklySchedule: weeklySchedule || [],
      coachId: targetCoachId
    });

  } catch (error) {
    console.error('Error in weekly schedule API:', error);
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
    const { coachId, dayOfWeek, startTime, endTime, isAvailable } = body;

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

    // Check permissions and determine target coach
    let targetCoachId = currentUser.id;
    
    if (currentUser.is_admin && coachId) {
      // Admin managing another coach's schedule
      targetCoachId = coachId;
    } else if (currentUser.is_admin && !coachId) {
      // Admin trying to modify without specifying a coach
      return NextResponse.json({ error: 'Admin must specify coachId in request body' }, { status: 400 });
    } else if (!currentUser.is_coach) {
      // Non-coach, non-admin user
      return NextResponse.json({ error: 'Only coaches can manage availability' }, { status: 403 });
    } else if (currentUser.is_coach && coachId && coachId !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own schedule' }, { status: 403 });
    }

    // Validate input
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Start time and end time are required' }, { status: 400 });
    }

    // Upsert weekly schedule
    const { data, error } = await supabase
      .from('coach_weekly_schedules')
      .upsert({
        coach_id: targetCoachId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'coach_id,day_of_week'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving weekly schedule:', error);
      return NextResponse.json({ error: 'Failed to save weekly schedule' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Weekly schedule saved successfully',
      schedule: data
    });

  } catch (error) {
    console.error('Error in weekly schedule API:', error);
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
    const coachId = searchParams.get('coach_id');
    const dayOfWeek = searchParams.get('day_of_week');

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

    // Check permissions and determine target coach
    let targetCoachId = currentUser.id;
    
    if (currentUser.is_admin && coachId) {
      // Admin deleting another coach's schedule
      targetCoachId = coachId;
    } else if (currentUser.is_admin && !coachId) {
      // Admin trying to delete without specifying a coach
      return NextResponse.json({ error: 'Admin must specify coach_id parameter' }, { status: 400 });
    } else if (!currentUser.is_coach) {
      // Non-coach, non-admin user
      return NextResponse.json({ error: 'Only coaches can manage availability' }, { status: 403 });
    } else if (currentUser.is_coach && coachId && coachId !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own schedule' }, { status: 403 });
    }

    if (!dayOfWeek) {
      return NextResponse.json({ error: 'Day of week is required' }, { status: 400 });
    }

    // Delete weekly schedule for specific day
    const { error } = await supabase
      .from('coach_weekly_schedules')
      .delete()
      .eq('coach_id', targetCoachId)
      .eq('day_of_week', parseInt(dayOfWeek));

    if (error) {
      console.error('Error deleting weekly schedule:', error);
      return NextResponse.json({ error: 'Failed to delete weekly schedule' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Weekly schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error in weekly schedule API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}