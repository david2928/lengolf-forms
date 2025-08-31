import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getRefacSupabaseClient } from '@/lib/refac-supabase';

// PUT /api/admin/competitors/[id] - Update competitor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const competitorId = parseInt(id);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, business_type, location, notes, is_active } = body;

    const supabase = getRefacSupabaseClient();

    const { data, error } = await supabase
      .schema('marketing').from('competitors')
      .update({
        name,
        business_type,
        location,
        notes,
        is_active
      })
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating competitor:', error);
      return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 });
    }

    return NextResponse.json({ 
      competitor: data,
      message: 'Competitor updated successfully' 
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/competitors/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/competitors/[id] - Soft delete competitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const competitorId = parseInt(id);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const supabase = getRefacSupabaseClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .schema('marketing').from('competitors')
      .update({ is_active: false })
      .eq('id', competitorId);

    if (error) {
      console.error('Error deleting competitor:', error);
      return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Competitor deleted successfully' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/competitors/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}