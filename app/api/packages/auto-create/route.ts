import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/packages/auto-create
 * Automatically creates packages from a paid transaction
 *
 * Body: { transaction_id: string }
 *
 * Returns: Array of created/skipped packages with details
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json({
        error: "Missing required field: transaction_id"
      }, { status: 400 });
    }

    // Call the auto-creation function
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('auto_create_packages_from_transaction', {
        p_transaction_id: transaction_id
      });

    if (error) {
      console.error('Error auto-creating packages:', error);
      return NextResponse.json({
        error: "Failed to auto-create packages",
        details: error.message
      }, { status: 500 });
    }

    // Filter out null results (no packages to create)
    const results = data || [];
    const created = results.filter((r: any) => r.created === true);
    const skipped = results.filter((r: any) => r.created === false);

    return NextResponse.json({
      success: true,
      transaction_id,
      summary: {
        total: results.length,
        created: created.length,
        skipped: skipped.length
      },
      packages: results,
      message: created.length > 0
        ? `Successfully created ${created.length} package(s)`
        : 'No packages created (already exist or no package products in transaction)'
    });

  } catch (error) {
    console.error('Auto-create packages API error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
