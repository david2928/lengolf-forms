import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { cacheLineProfileImage } from '@/lib/line/storage-handler';
import { fetchLineUserProfile } from '@/lib/line/webhook-handler';

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch line_users that need caching:
    // - cached_picture_url is empty string AND picture_cached_at is the bulk-update timestamp
    //   (meaning we haven't individually attempted them yet)
    // - cached_picture_url is NULL (never attempted)
    // Order by last_seen_at DESC so active users are processed first
    const BULK_UPDATE_TS = '2026-02-13 15:16:53.916416+00';
    const { data: users, error } = await refacSupabaseAdmin
      .from('line_users')
      .select('line_user_id, picture_url, cached_picture_url, picture_cached_at')
      .or(`cached_picture_url.is.null,and(cached_picture_url.eq.,picture_cached_at.eq.${BULK_UPDATE_TS})`)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
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
        // Fetch fresh profile from LINE API (gets a current, non-expired CDN URL)
        const freshProfile = await fetchLineUserProfile(user.line_user_id);

        const pictureUrl = freshProfile?.pictureUrl || user.picture_url;

        if (!pictureUrl) {
          // User has no profile picture at all - mark as attempted
          await refacSupabaseAdmin
            .from('line_users')
            .update({ cached_picture_url: null, picture_cached_at: new Date().toISOString() })
            .eq('line_user_id', user.line_user_id);
          failed++;
          continue;
        }

        // Also update the stored picture_url if we got a fresh one from LINE API
        if (freshProfile?.pictureUrl && freshProfile.pictureUrl !== user.picture_url) {
          await refacSupabaseAdmin
            .from('line_users')
            .update({ picture_url: freshProfile.pictureUrl })
            .eq('line_user_id', user.line_user_id);
        }

        const cachedUrl = await cacheLineProfileImage(user.line_user_id, pictureUrl);

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
          // Mark as attempted so we don't retry this user
          await refacSupabaseAdmin
            .from('line_users')
            .update({ picture_cached_at: new Date().toISOString() })
            .eq('line_user_id', user.line_user_id);
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
      .or(`cached_picture_url.is.null,and(cached_picture_url.eq.,picture_cached_at.eq.${BULK_UPDATE_TS})`);

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
