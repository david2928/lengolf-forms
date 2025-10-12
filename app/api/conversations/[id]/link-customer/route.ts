import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Unified customer linking endpoint
 * Works with all conversation types: LINE, Website, Facebook, Instagram, WhatsApp
 * Uses conversation ID instead of platform-specific IDs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { customerId } = await request.json();
    const { id: conversationId } = await params;

    if (!customerId || !conversationId) {
      return NextResponse.json({
        error: "Missing customerId or conversationId"
      }, { status: 400 });
    }

    // First, get the conversation to determine which platform and get platform-specific data
    const { data: unifiedConversation, error: convError } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !unifiedConversation) {
      return NextResponse.json({
        error: "Conversation not found"
      }, { status: 404 });
    }

    const channelType = unifiedConversation.channel_type;
    const channelUserId = unifiedConversation.channel_user_id;

    // Handle platform-specific linking logic
    let linkingResult;

    if (channelType === 'line') {
      // Link LINE user to customer
      linkingResult = await linkLineUserToCustomer(channelUserId, customerId);
    } else if (channelType === 'website') {
      // Link website session to customer
      linkingResult = await linkWebsiteUserToCustomer(channelUserId, customerId);
    } else if (['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
      // Link Meta platform user to customer
      linkingResult = await linkMetaUserToCustomer(channelType, channelUserId, customerId);
    } else {
      return NextResponse.json({
        error: `Unsupported channel type: ${channelType}`
      }, { status: 400 });
    }

    if (!linkingResult.success) {
      return NextResponse.json({
        error: linkingResult.error
      }, { status: 500 });
    }

    // Note: We don't update unified_conversations directly as it's a view
    // The customer_id will be automatically reflected through the underlying tables
    // that were updated in the platform-specific linking functions above

    return NextResponse.json({
      success: true,
      message: `Customer linked successfully to ${channelType} conversation`,
      channelType,
      customerId
    });

  } catch (error) {
    console.error('Error linking customer:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

/**
 * Link LINE user to customer
 */
async function linkLineUserToCustomer(lineUserId: string, customerId: string) {
  try {
    // Update LINE user with customer ID
    const { error: lineUserError } = await refacSupabaseAdmin
      .from('line_users')
      .update({ customer_id: customerId })
      .eq('line_user_id', lineUserId);

    if (lineUserError) {
      return { success: false, error: `Error linking LINE user: ${lineUserError.message}` };
    }

    // Update LINE conversations with customer ID
    const { error: convError } = await refacSupabaseAdmin
      .from('line_conversations')
      .update({ customer_id: customerId })
      .eq('line_user_id', lineUserId);

    if (convError) {
      console.error('Warning: Error updating LINE conversations:', convError);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Error in LINE linking: ${error}` };
  }
}

/**
 * Link website user to customer
 */
async function linkWebsiteUserToCustomer(sessionId: string, customerId: string) {
  try {
    // Update web chat session with customer ID
    // Note: sessionId here is actually the UUID 'id' field from web_chat_sessions,
    // not the text 'session_id' field. This comes from unified_conversations.channel_user_id
    // which is set to wcc.session_id::text (where wcc.session_id is the UUID id).
    const { error: sessionError } = await refacSupabaseAdmin
      .from('web_chat_sessions')
      .update({ customer_id: customerId })
      .eq('id', sessionId);

    if (sessionError) {
      return { success: false, error: `Error linking website user: ${sessionError.message}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Error in website linking: ${error}` };
  }
}

/**
 * Link Meta platform user to customer
 */
async function linkMetaUserToCustomer(channelType: string, platformUserId: string, customerId: string) {
  try {
    // Update Meta user with customer ID
    const { error: metaUserError } = await refacSupabaseAdmin
      .from('meta_users')
      .update({ customer_id: customerId })
      .eq('platform_user_id', platformUserId)
      .eq('platform', channelType);

    if (metaUserError) {
      return { success: false, error: `Error linking Meta user: ${metaUserError.message}` };
    }

    // Update Meta conversations with customer ID
    const { error: convError } = await refacSupabaseAdmin
      .from('meta_conversations')
      .update({ customer_id: customerId })
      .eq('platform_user_id', platformUserId)
      .eq('platform', channelType);

    if (convError) {
      console.error('Warning: Error updating Meta conversations:', convError);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Error in Meta ${channelType} linking: ${error}` };
  }
}