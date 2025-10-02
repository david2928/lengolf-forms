import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get all flex templates
 * GET /api/line/flex-templates
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');

    let query = refacSupabaseAdmin
      .from('line_flex_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching flex templates:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('Failed to fetch flex templates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create new flex template
 * POST /api/line/flex-templates
 */
export async function POST(request: NextRequest) {
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

    const {
      name,
      description,
      category,
      flex_json,
      variables,
      has_opt_out_button = false,
      is_active = true
    } = await request.json();

    // Validate required fields
    if (!name || !flex_json) {
      return NextResponse.json({
        success: false,
        error: 'Name and flex_json are required'
      }, { status: 400 });
    }

    // Validate flex_json structure
    if (typeof flex_json !== 'object' || !flex_json.type) {
      return NextResponse.json({
        success: false,
        error: 'Invalid flex_json structure'
      }, { status: 400 });
    }

    const { data: template, error } = await refacSupabaseAdmin
      .from('line_flex_templates')
      .insert({
        name,
        description,
        category,
        flex_json,
        variables,
        has_opt_out_button,
        is_active,
        created_by: session.user.email
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating flex template:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Failed to create flex template:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
