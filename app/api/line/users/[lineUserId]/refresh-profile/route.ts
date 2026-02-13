import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { fetchLineUserProfile, storeLineUserProfile } from '@/lib/line/webhook-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { lineUserId } = await params;

    if (!lineUserId || !/^U[a-f0-9]{32}$/i.test(lineUserId)) {
      return NextResponse.json({ error: "Invalid lineUserId" }, { status: 400 });
    }

    // Fetch fresh profile from LINE API
    const profile = await fetchLineUserProfile(lineUserId);

    if (!profile) {
      return NextResponse.json(
        { error: "Could not fetch LINE profile" },
        { status: 404 }
      );
    }

    // Store profile + cache image to Supabase Storage
    await storeLineUserProfile(profile);

    return NextResponse.json({
      success: true,
      profile: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl
      }
    });
  } catch (error) {
    console.error("Error refreshing LINE profile:", error);
    return NextResponse.json(
      { error: "Failed to refresh profile" },
      { status: 500 }
    );
  }
}
