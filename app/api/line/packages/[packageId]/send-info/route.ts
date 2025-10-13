import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { createPackageInfoMessage } from '@/lib/line/flex-templates';

interface PackageInfoRequest {
  messageFormat?: 'text' | 'flex' | 'both';
  senderName?: string;
}

/**
 * Send package information to LINE user
 * POST /api/line/packages/[packageId]/send-info
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
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

    const { packageId } = await params;
    const { messageFormat = 'flex', senderName = 'Admin' }: PackageInfoRequest = await request.json();

    // Fetch package details from backoffice.packages
    const { data: pkg, error: packageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id,
        customer_id,
        customer_name,
        purchase_date,
        first_use_date,
        expiration_date,
        employee_name,
        package_types!inner(
          name,
          type,
          hours
        )
      `)
      .eq('id', packageId)
      .single();

    if (packageError || !pkg) {
      return NextResponse.json({
        error: "Package not found",
        details: packageError?.message,
        packageId
      }, { status: 404 });
    }

    // Check if package is expired
    const today = new Date().toISOString().split('T')[0];
    if (pkg.expiration_date < today) {
      return NextResponse.json({
        error: `Cannot send info for expired package. Package expired on ${pkg.expiration_date}.`,
        expirationDate: pkg.expiration_date
      }, { status: 400 });
    }

    // Get package usage data
    const { data: usageData } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .select('used_hours')
      .eq('package_id', packageId);

    const totalUsed = usageData
      ?.reduce((sum: number, usage: any) => sum + Number(usage.used_hours || 0), 0) || 0;

    const totalHours = Number((pkg.package_types as any).hours || 0);
    const packageType = (pkg.package_types as any).type;
    const isUnlimited = packageType === 'Unlimited';
    const remainingHours = isUnlimited
      ? 'Unlimited'
      : Math.max(0, totalHours - totalUsed).toString();

    // Check if package has no remaining hours
    if (!isUnlimited && Number(remainingHours) <= 0) {
      return NextResponse.json({
        error: `Cannot send info for package with no remaining hours.`,
        remainingHours: 0
      }, { status: 400 });
    }

    // Get customer information to find LINE user
    const { data: customer } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, contact_number')
      .eq('id', pkg.customer_id)
      .single();

    // Find linked LINE user for this customer
    let lineUserId: string | null = null;
    let conversationId: string | null = null;

    if (pkg.customer_id) {
      // Check if customer has a linked LINE user
      const { data: lineUser } = await refacSupabaseAdmin
        .from('line_users')
        .select('line_user_id')
        .eq('customer_id', pkg.customer_id)
        .single();

      if (lineUser) {
        lineUserId = lineUser.line_user_id;

        // Get or create conversation
        const { data: conversation } = await refacSupabaseAdmin
          .from('line_conversations')
          .select('id')
          .eq('line_user_id', lineUserId)
          .single();

        if (conversation) {
          conversationId = conversation.id;
        }
      }
    }

    if (!lineUserId) {
      return NextResponse.json({
        error: "Customer does not have a linked LINE account",
        suggestion: "Please link the customer's LINE account first"
      }, { status: 400 });
    }

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({
        error: "LINE messaging not configured"
      }, { status: 500 });
    }

    // Calculate days until expiry
    const expiryDate = new Date(pkg.expiration_date);
    const todayDate = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine if this is a coaching package
    const packageTypeName = (pkg.package_types as any)?.name || 'Package';
    const isCoaching = packageTypeName.toLowerCase().includes('coaching') ||
                      packageTypeName.toLowerCase().includes('coach');

    // Set used hours and total hours
    const usedHours = totalUsed;

    // Prepare package data for flex message
    const packageDetails = {
      packageId: pkg.id,
      customerName: pkg.customer_name || customer?.customer_name || 'Customer',
      packageName: packageTypeName,
      isCoaching: isCoaching,
      hoursLeft: remainingHours?.toString() || 'Unlimited',
      usedHours: usedHours,
      totalHours: isUnlimited ? undefined : totalHours,
      expirationDate: expiryDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      daysUntilExpiry: daysUntilExpiry
    };

    // Create package info flex message
    const flexMessage = createPackageInfoMessage(packageDetails);
    const messagesToSend = [flexMessage];

    // Send messages via LINE API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messagesToSend
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);

      let errorMessage = 'Failed to send package information';
      if (lineResponse.status === 401) {
        errorMessage = 'LINE API authentication failed';
      } else if (lineResponse.status === 400) {
        errorMessage = 'Customer may not be reachable via LINE';
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store package info message in database if we have a conversation
    if (conversationId) {
      const messageText = `📦 Package Information: ${packageTypeName}`;

      const { data: storedMessage, error: messageError } = await refacSupabaseAdmin
        .from('line_messages')
        .insert({
          conversation_id: conversationId,
          line_user_id: lineUserId,
          message_type: 'flex',
          message_text: messageText,
          sender_type: 'admin',
          sender_name: senderName,
          timestamp: Date.now(),
          is_read: true,
          raw_event: {
            type: 'package_info',
            flex_type: 'package_info',
            package_id: packageId,
            message_format: 'flex',
            package_details: packageDetails
          }
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error storing package info message:', messageError);
      }

      // Update conversation
      await refacSupabaseAdmin
        .from('line_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: messageText,
          last_message_by: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    return NextResponse.json({
      success: true,
      message: 'Package information sent successfully',
      package: {
        id: pkg.id,
        customerName: pkg.customer_name,
        packageName: packageTypeName
      },
      messageFormat: 'flex',
      lineUserId
    });

  } catch (error: any) {
    console.error('Error sending package information:', error);
    return NextResponse.json({
      error: "Failed to send package information",
      details: error.message
    }, { status: 500 });
  }
}
