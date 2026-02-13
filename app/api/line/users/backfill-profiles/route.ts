import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { cacheLineProfileImage } from '@/lib/line/storage-handler';

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch line_users that have a picture_url but no cached version yet
    const { data: users, error } = await refacSupabaseAdmin
      .from('line_users')
      .select('line_user_id, picture_url')
      .not('picture_url', 'is', null)
      .is('cached_picture_url', null)
      .limit(BATCH_SIZE);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users need backfilling",
        processed: 0,
        remaining: 0
      });
    }

    let succeeded = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const cachedUrl = await cacheLineProfileImage(user.line_user_id, user.picture_url);

        if (cachedUrl) {
          const { error: updateError } = await refacSupabaseAdmin
            .from('line_users')
            .update({
              cached_picture_url: cachedUrl,
              picture_cached_at: new Date().toISOString()
            })
            .eq('line_user_id', user.line_user_id);

          if (updateError) {
            console.error(`Failed to update cached URL for ${user.line_user_id}:`, updateError);
            failed++;
          } else {
            succeeded++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Check remaining count
    const { count } = await refacSupabaseAdmin
      .from('line_users')
      .select('*', { count: 'exact', head: true })
      .not('picture_url', 'is', null)
      .is('cached_picture_url', null);

    return NextResponse.json({
      success: true,
      processed: users.length,
      succeeded,
      failed,
      remaining: count || 0
    });
  } catch (error) {
    console.error("Error backfilling profiles:", error);
    return NextResponse.json(
      { error: "Failed to backfill profiles" },
      { status: 500 }
    );
  }
}
