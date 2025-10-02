import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get specific flex template
 * GET /api/line/flex-templates/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { id: templateId } = await params;

    const { data: template, error } = await refacSupabaseAdmin
      .from('line_flex_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Failed to fetch flex template:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update flex template
 * PATCH /api/line/flex-templates/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { id: templateId } = await params;
    const {
      name,
      description,
      category,
      flex_json,
      variables,
      has_opt_out_button,
      is_active
    } = await request.json();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (flex_json !== undefined) updateData.flex_json = flex_json;
    if (variables !== undefined) updateData.variables = variables;
    if (has_opt_out_button !== undefined) updateData.has_opt_out_button = has_opt_out_button;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error } = await refacSupabaseAdmin
      .from('line_flex_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating flex template:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Failed to update flex template:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Delete flex template
 * DELETE /api/line/flex-templates/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { id: templateId } = await params;

    const { error } = await refacSupabaseAdmin
      .from('line_flex_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting flex template:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete flex template:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
