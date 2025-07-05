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

    // Only super-admin can access rates (contains financial data)
    // Regular staff should not see pricing information
    return NextResponse.json({ error: 'Access to rates is restricted' }, { status: 403 });

    // Get coaching rates
    let query = supabase
      .schema('backoffice')
      .from('coaching_rates')
      .select(`
        id,
        coach_id,
        lesson_type,
        duration_minutes,
        price_per_session,
        price_per_person,
        max_participants,
        min_participants,
        description,
        is_active,
        effective_from,
        effective_until,
        created_at,
        updated_at
      `)
      .order('lesson_type')
      .order('duration_minutes');

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    const { data: rates, error } = await query;

    if (error) {
      console.error('Error fetching rates:', error);
      return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }

    return NextResponse.json({ rates });

  } catch (error) {
    console.error('Error in rates API:', error);
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

    // Check permissions - only admins can create/update rates
    if (!user.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin required' }, { status: 403 });
    }

    const {
      coach_id,
      lesson_type,
      duration_minutes,
      price_per_session,
      price_per_person,
      max_participants,
      min_participants,
      description,
      effective_from,
      effective_until
    } = body;

    // Validate required fields
    if (!coach_id || !lesson_type || !duration_minutes || !price_per_session) {
      return NextResponse.json({ 
        error: 'Missing required fields: coach_id, lesson_type, duration_minutes, price_per_session' 
      }, { status: 400 });
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

    // Create the rate
    const { data: rate, error } = await supabase
      .schema('backoffice')
      .from('coaching_rates')
      .insert({
        coach_id,
        lesson_type,
        duration_minutes,
        price_per_session,
        price_per_person,
        max_participants: max_participants || 1,
        min_participants: min_participants || 1,
        description,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
        effective_until
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rate:', error);
      return NextResponse.json({ error: 'Failed to create rate' }, { status: 500 });
    }

    return NextResponse.json({ rate });

  } catch (error) {
    console.error('Error in rates POST API:', error);
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
      return NextResponse.json({ error: 'Rate ID required' }, { status: 400 });
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin required' }, { status: 403 });
    }

    // Update the rate
    const { data: rate, error } = await supabase
      .schema('backoffice')
      .from('coaching_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rate:', error);
      return NextResponse.json({ error: 'Failed to update rate' }, { status: 500 });
    }

    return NextResponse.json({ rate });

  } catch (error) {
    console.error('Error in rates PUT API:', error);
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
    const rateId = searchParams.get('id');

    if (!rateId) {
      return NextResponse.json({ error: 'Rate ID required' }, { status: 400 });
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin required' }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { data: rate, error } = await supabase
      .schema('backoffice')
      .from('coaching_rates')
      .update({ is_active: false })
      .eq('id', rateId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting rate:', error);
      return NextResponse.json({ error: 'Failed to delete rate' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Rate deleted successfully', rate });

  } catch (error) {
    console.error('Error in rates DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 