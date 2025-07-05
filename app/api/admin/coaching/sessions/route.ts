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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - only admins can access this staff view
    if (!user.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get coach display name if specific coach is requested
    let coachDisplayName = null;
    if (coachId) {
      const { data: coach } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('coach_display_name, coach_name')
        .eq('id', coachId)
        .single();
      
      coachDisplayName = coach?.coach_display_name || coach?.coach_name;
    }

    // Build query from bookings table (only coaching sessions)
    let query = supabase
      .from('bookings')
      .select(`
        id,
        name,
        phone_number,
        date,
        start_time,
        duration,
        booking_type,
        number_of_people,
        status,
        bay
      `)
      .ilike('booking_type', 'Coaching%')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(limit);

    if (coachDisplayName) {
      query = query.ilike('booking_type', `%${coachDisplayName}%`);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Transform bookings to sessions format (without financial data)
    const sessions = (bookings || []).map(booking => {
      const endTime = booking.start_time ? 
        `${(parseInt(booking.start_time.split(':')[0]) + (booking.duration || 1)).toString().padStart(2, '0')}:${booking.start_time.split(':')[1]}` :
        null;

      return {
        id: booking.id,
        customer_name: booking.name,
        session_date: booking.date,
        start_time: booking.start_time,
        end_time: endTime,
        lesson_type: booking.booking_type,
        session_rate: 'N/A', // Hidden for staff
        total_amount: 'N/A', // Hidden for staff  
        payment_status: 'confirmed', // Assume confirmed if in bookings
        session_status: booking.status,
        number_of_participants: booking.number_of_people || 1,
        bay_number: booking.bay
      };
    });

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error in sessions API:', error);
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

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - coaches can create sessions, admins can create for any coach
    if (!user.is_admin && !user.is_coach) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      coach_id,
      customer_name,
      customer_contact,
      customer_email,
      session_date,
      start_time,
      end_time,
      lesson_type,
      number_of_participants,
      session_rate,
      total_amount,
      bay_number,
      notes
    } = body;

    // Validate required fields
    if (!coach_id || !customer_name || !session_date || !start_time || !end_time || !lesson_type || !session_rate) {
      return NextResponse.json({ 
        error: 'Missing required fields: coach_id, customer_name, session_date, start_time, end_time, lesson_type, session_rate' 
      }, { status: 400 });
    }

    // If not admin, can only create sessions for themselves
    if (!user.is_admin && coach_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Can only create sessions for yourself' }, { status: 403 });
    }

    // Verify coach exists
    const { data: coach, error: coachError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach')
      .eq('id', coach_id)
      .single();

    if (coachError || !coach || !coach.is_coach) {
      return NextResponse.json({ error: 'Invalid coach ID' }, { status: 400 });
    }

    // Create the session
    const { data: sessionData, error } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .insert({
        coach_id,
        customer_name,
        customer_contact,
        customer_email,
        session_date,
        start_time,
        end_time,
        lesson_type,
        number_of_participants: number_of_participants || 1,
        session_rate,
        total_amount: total_amount || session_rate,
        bay_number,
        notes,
        session_status: 'scheduled',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session: sessionData });

  } catch (error) {
    console.error('Error in sessions POST API:', error);
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    if (!user.is_admin && !user.is_coach) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the existing session to check ownership
    const { data: existingSession, error: existingError } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .select('coach_id')
      .eq('id', id)
      .single();

    if (existingError || !existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If not admin, can only update own sessions
    if (!user.is_admin && existingSession.coach_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Can only update your own sessions' }, { status: 403 });
    }

    // Update the session
    const { data: sessionData, error } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ session: sessionData });

  } catch (error) {
    console.error('Error in sessions PUT API:', error);
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
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    if (!user.is_admin && !user.is_coach) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the existing session to check ownership
    const { data: existingSession, error: existingError } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .select('coach_id, session_status')
      .eq('id', sessionId)
      .single();

    if (existingError || !existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If not admin, can only delete own sessions
    if (!user.is_admin && existingSession.coach_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Can only delete your own sessions' }, { status: 403 });
    }

    // Soft delete by setting status to cancelled
    const { data: sessionData, error } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .update({ 
        session_status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling session:', error);
      return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session cancelled successfully', session: sessionData });

  } catch (error) {
    console.error('Error in sessions DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 