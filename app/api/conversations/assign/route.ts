import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface AssignConversationRequest {
  conversationId: string;
  channelType: 'line' | 'website' | 'instagram' | 'facebook' | 'whatsapp';
  assignToEmail: string | null; // null for unassign
}

/**
 * Assign or unassign a conversation to a staff member
 * POST /api/conversations/assign
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
      .select('is_admin, is_staff, display_name')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { conversationId, channelType, assignToEmail }: AssignConversationRequest = await request.json();

    if (!conversationId || !channelType) {
      return NextResponse.json({
        error: "conversationId and channelType are required"
      }, { status: 400 });
    }

    // Validate assignToEmail if provided (null means unassign)
    let assigneeDisplayName: string | null = null;
    if (assignToEmail) {
      const { data: assignee, error: assigneeError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('allowed_users')
        .select('display_name, is_admin, is_staff')
        .eq('email', assignToEmail)
        .single();

      if (assigneeError || !assignee) {
        return NextResponse.json({
          error: "Invalid staff email - user not found in allowed_users"
        }, { status: 400 });
      }

      if (!assignee.is_admin && !assignee.is_staff) {
        return NextResponse.json({
          error: "Cannot assign to user - not a staff member or admin"
        }, { status: 400 });
      }

      assigneeDisplayName = assignee.display_name;
    }

    // Determine which table to update
    const tableMap = {
      line: 'line_conversations',
      website: 'web_chat_conversations',
      instagram: 'meta_conversations',
      facebook: 'meta_conversations',
      whatsapp: 'meta_conversations'
    };

    const tableName = tableMap[channelType];
    if (!tableName) {
      return NextResponse.json({
        error: `Invalid channelType: ${channelType}`
      }, { status: 400 });
    }

    // Update the conversation with assignment
    const { data: updatedConversation, error: updateError } = await refacSupabaseAdmin
      .from(tableName)
      .update({
        assigned_to: assignToEmail,
        assigned_at: assignToEmail ? new Date().toISOString() : null,
        assigned_by: assignToEmail ? session.user.email : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation assignment:', updateError);
      return NextResponse.json({
        error: "Failed to update conversation assignment",
        details: updateError.message
      }, { status: 500 });
    }

    if (!updatedConversation) {
      return NextResponse.json({
        error: "Conversation not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignedTo: assignToEmail ? {
        email: assignToEmail,
        displayName: assigneeDisplayName || assignToEmail
      } : null,
      assignedBy: session.user.email,
      assignedAt: updatedConversation.assigned_at
    });

  } catch (error: any) {
    console.error('Error assigning conversation:', error);
    return NextResponse.json({
      error: "Failed to assign conversation",
      details: error.message
    }, { status: 500 });
  }
}
