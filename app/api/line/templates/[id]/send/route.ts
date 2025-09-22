import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Simple template variable substitution
function processTemplate(content: string, variables: Record<string, any>): string {
  let processed = content;

  // Replace {{customer_name}} with actual customer name
  if (variables.customer_name) {
    processed = processed.replace(/\{\{customer_name\}\}/g, variables.customer_name);
  }

  // Add more variable replacements here as needed

  return processed;
}

// POST - Send template to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { conversationId, variables = {}, senderName = 'Admin' } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get the template
    const { data: template, error: templateError } = await refacSupabaseAdmin
      .from('line_message_templates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or inactive' },
        { status: 404 }
      );
    }

    // Get conversation details to get customer name if not provided
    const { data: conversation, error: convError } = await refacSupabaseAdmin
      .from('line_conversations')
      .select(`
        id,
        line_user_id,
        line_users!inner(display_name)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Set customer name if not provided
    if (!variables.customer_name && conversation.line_users?.display_name) {
      variables.customer_name = conversation.line_users.display_name;
    }

    let messageToSend: any;
    let messageText: string;

    if (template.message_type === 'flex') {
      // Handle rich/flex messages
      try {
        const flexContent = JSON.parse(template.content);
        messageToSend = flexContent;
        messageText = `[Rich message: ${template.title}]`;
      } catch (error) {
        console.error('Error parsing flex message content:', error);
        return NextResponse.json(
          { error: 'Invalid flex message content' },
          { status: 400 }
        );
      }
    } else {
      // Handle text messages with variable substitution
      messageText = processTemplate(template.content, variables);
      messageToSend = messageText;
    }

    // Send the message via the existing conversation endpoint
    // Use the same pattern as other internal API calls in the codebase
    const internalUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://lengolf-forms.vercel.app';

    const sendResponse = await fetch(
      `${internalUrl}/api/line/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          message: messageToSend,
          type: template.message_type,
          senderName,
          templateId: id
        })
      }
    );

    // Check if the response is okay first
    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error(`Failed to send message: ${sendResponse.status} ${sendResponse.statusText} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to send message', details: `HTTP ${sendResponse.status}: ${errorText}` },
        { status: 500 }
      );
    }

    // Try to parse as JSON, handle non-JSON responses
    let sendResult;
    try {
      sendResult = await sendResponse.json();
    } catch (parseError) {
      const responseText = await sendResponse.text();
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from message API', details: 'Response is not valid JSON' },
        { status: 500 }
      );
    }

    if (!sendResult.success) {
      return NextResponse.json(
        { error: 'Failed to send message', details: sendResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: sendResult.message,
      template: {
        id: template.id,
        title: template.title,
        category: template.category,
        message_type: template.message_type
      }
    });

  } catch (error) {
    console.error('Error sending template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}