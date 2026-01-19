# WhatsApp Business API Setup Guide

This guide covers how to set up WhatsApp Business API integration for the Lengolf Forms unified chat system, including migrating from Meta Business Manager to the WhatsApp Cloud API.

## Table of Contents

1. [Important: API vs WhatsApp Business App](#important-api-vs-whatsapp-business-app)
2. [Prerequisites](#prerequisites)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Step 1: Access Meta Business Suite](#step-1-access-meta-business-suite)
4. [Step 2: Create or Access Meta Developer App](#step-2-create-or-access-meta-developer-app)
5. [Step 3: Add WhatsApp Product to Your App](#step-3-add-whatsapp-product-to-your-app)
6. [Step 4: Get Your Phone Number ID](#step-4-get-your-phone-number-id)
7. [Step 5: Configure Webhooks](#step-5-configure-webhooks)
8. [Step 6: Generate Access Token with WhatsApp Permissions](#step-6-generate-access-token-with-whatsapp-permissions)
9. [Step 7: Configure Environment Variables](#step-7-configure-environment-variables)
10. [Step 8: Test the Integration](#step-8-test-the-integration)
11. [Troubleshooting](#troubleshooting)
12. [WhatsApp Messaging Rules](#whatsapp-messaging-rules)

---

## Important: API vs WhatsApp Business App

### Can You Use Both Simultaneously?

**Short Answer: NO - you cannot use both the WhatsApp Business App and the Cloud API on the same phone number.**

When you migrate a phone number to the WhatsApp Cloud API:

| What Changes | Details |
|--------------|---------|
| **WhatsApp Business App** | **Disabled** - Cannot use the app with this number anymore |
| **WhatsApp Cloud API** | **Active** - All messages handled via API/webhooks |
| **Meta Business Suite** | **Available** - Can view/reply via web interface |

### Your Options

#### Option 1: API Only (Recommended for Lengolf)
- Register your business number with WhatsApp Cloud API
- Handle all messages through the unified chat system
- Use Meta Business Suite web interface as backup
- **Best for**: Centralized customer service

#### Option 2: Two Numbers (Hybrid Approach)
- Keep one number on WhatsApp Business App for quick replies
- Use a different number for API integration
- **Best for**: Transitional period or specialized use cases

#### Option 3: Meta Business Suite Web Interface
Even with API integration, you can still:
- View conversations at [business.facebook.com](https://business.facebook.com)
- Send quick replies through the Meta Business Suite
- Both the API and Meta Business Suite can work together

### Important Considerations

1. **Migration is One-Way**: Once you move a number to Cloud API, you cannot easily revert to the Business App
2. **Existing Conversations**: Message history from the Business App is **not** transferred to API
3. **Staff Training**: Staff must use the unified chat system (or Meta Business Suite) instead of the mobile app
4. **24-Hour Window**: API follows the same 24-hour messaging rules

### Recommendation for Lengolf

**Use Option 1 (API Only)** because:
- All customer messages come through the unified chat system
- Staff can respond from one interface (LINE + Facebook + Instagram + WhatsApp)
- Better tracking and SLA monitoring
- Meta Business Suite serves as backup for quick replies

---

## Prerequisites

Before starting, ensure you have:

- [ ] A **Meta Business Account** (business.facebook.com)
- [ ] A **Facebook Page** connected to your business
- [ ] A **verified business** in Meta Business Manager (required for production)
- [ ] Access to **Meta for Developers** (developers.facebook.com)
- [ ] A **phone number** that can receive SMS or calls for verification
- [ ] Your application deployed with a public HTTPS URL for webhooks

---

## Understanding the Architecture

### How WhatsApp Cloud API Works

```
Customer WhatsApp --> Meta Cloud --> Webhook --> Your App --> Database
                                                    |
                                                    v
Your App --> Meta Cloud API --> Customer WhatsApp (Reply)
```

### Key Components

| Component | Description |
|-----------|-------------|
| **WhatsApp Business Account (WABA)** | Your business identity on WhatsApp |
| **Phone Number ID** | Unique identifier for your WhatsApp business number |
| **Access Token** | Authentication credential for API calls |
| **Webhook** | Endpoint that receives incoming messages |
| **App Secret** | Used to verify webhook signatures |

---

## Step 1: Access Meta Business Suite

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Log in with your Facebook account
3. Select your business or create a new one

### If you don't have a Business Account:

1. Click **Create Account**
2. Enter your business name and email
3. Complete the verification process
4. Add your Facebook Page to the business account

---

## Step 2: Create or Access Meta Developer App

### Option A: Create a New App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click **My Apps** in the top right
3. Click **Create App**
4. Select **Business** as the app type
5. Enter app details:
   - **App Name**: `Lengolf Forms` (or your preferred name)
   - **Contact Email**: Your business email
   - **Business Account**: Select your Meta Business Account
6. Click **Create App**

### Option B: Use Existing App

If you already have an app for Facebook/Instagram Messenger:

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Select your existing app
3. Proceed to add WhatsApp product

---

## Step 3: Add WhatsApp Product to Your App

1. In your app dashboard, click **Add Product** in the left sidebar
2. Find **WhatsApp** and click **Set Up**
3. You'll be prompted to select or create a WhatsApp Business Account

### If creating a new WhatsApp Business Account:

1. Click **Create a WhatsApp Business Account**
2. Enter your business details
3. Select a display name (customers will see this)
4. Add a business description and category

### Connecting an Existing Phone Number:

1. In WhatsApp settings, go to **Phone Numbers**
2. Click **Add Phone Number**
3. Enter your business phone number
4. Choose verification method (SMS or Voice Call)
5. Enter the verification code
6. Complete the setup

> **Important**: This phone number cannot be registered with WhatsApp Messenger or another WhatsApp Business API account.

---

## Step 4: Get Your Phone Number ID

The **Phone Number ID** is a crucial credential needed for API calls.

### Method 1: From WhatsApp Manager

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Click **All Tools** > **WhatsApp Manager**
3. Or navigate directly to: https://business.facebook.com/wa/manage/phone-numbers/
4. Select your WhatsApp Business Account
5. Click on your phone number
6. The **Phone Number ID** is displayed (it's a numeric string like `123456789012345`)

### Method 2: From Meta Developer Portal

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Select your app
3. In the left sidebar, click **WhatsApp** > **API Setup**
4. Under **Step 1: Select phone numbers**, the Phone Number ID is shown

### Method 3: From API Setup Page

1. In your Meta App, go to **WhatsApp** > **API Setup**
2. Look at the **From** dropdown
3. The Phone Number ID is displayed next to your number

**Copy this ID** - you'll need it for the `META_WA_PHONE_NUMBER_ID` environment variable.

---

## Step 5: Configure Webhooks

Webhooks allow your application to receive incoming WhatsApp messages.

### 5.1 Set Your Webhook URL

1. In your Meta App, go to **WhatsApp** > **Configuration**
2. Under **Webhook**, click **Edit**
3. Enter your webhook details:
   - **Callback URL**: `https://your-domain.com/api/meta/webhook`
   - **Verify Token**: Use the same value as `META_WEBHOOK_VERIFY_TOKEN` in your `.env`

### 5.2 Subscribe to Webhook Fields

After verification, subscribe to these webhook fields:

| Field | Description | Required |
|-------|-------------|----------|
| `messages` | Receive incoming messages | **Yes** |
| `message_template_status_update` | Template approval updates | Optional |

Click **Subscribe** next to each field you want.

### 5.3 Verify Webhook

1. Click **Verify and Save**
2. Meta will send a GET request to your webhook URL
3. Your app should respond with the `hub.challenge` value
4. If successful, you'll see a green checkmark

> **Note**: The Lengolf Forms webhook at `/api/meta/webhook` already handles verification automatically.

---

## Step 6: Generate Access Token with WhatsApp Permissions

Your existing `META_PAGE_ACCESS_TOKEN` may need additional permissions for WhatsApp.

### Check Required Permissions

Your access token needs these permissions:

| Permission | Description |
|------------|-------------|
| `whatsapp_business_management` | Manage WhatsApp Business Account |
| `whatsapp_business_messaging` | Send and receive WhatsApp messages |

### Generate a New Token with WhatsApp Permissions

1. Go to your Meta App > **App Settings** > **Basic**
2. Navigate to **WhatsApp** > **API Setup**
3. Under **Step 5: Add a System User**, click **Get Started**
4. Create or select a System User
5. Generate a token with these permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `pages_messaging` (if using FB/IG too)

### Using a Single Token for All Platforms

If you want one token for Facebook, Instagram, AND WhatsApp:

1. Go to **Business Settings** > **System Users**
2. Select or create a System User
3. Click **Generate New Token**
4. Select your app
5. Check all required permissions:
   - `pages_messaging`
   - `pages_manage_metadata`
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
6. Click **Generate Token**
7. Copy and save the token securely

---

## Step 7: Configure Environment Variables

Add these variables to your `.env` and `.env.local` files:

```env
# WhatsApp Business API Configuration
META_WA_PHONE_NUMBER_ID=your_phone_number_id_here

# These should already be configured from FB/IG setup
META_APP_SECRET=your_app_secret
META_PAGE_ACCESS_TOKEN=your_unified_access_token
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### Environment Variable Reference

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `META_WA_PHONE_NUMBER_ID` | Your WhatsApp phone number ID | WhatsApp Manager or API Setup page |
| `META_APP_SECRET` | App secret for signature verification | App Settings > Basic |
| `META_PAGE_ACCESS_TOKEN` | Access token with WhatsApp permissions | System User token generation |
| `META_WEBHOOK_VERIFY_TOKEN` | Your custom webhook verification string | You create this |

### Add to Vercel (Production)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add `META_WA_PHONE_NUMBER_ID` with your phone number ID
4. Ensure other Meta variables are present
5. Redeploy your application

---

## Step 8: Test the Integration

### 8.1 Send a Test Message TO Your Business

1. From a personal WhatsApp account, send a message to your business number
2. Check Supabase logs for the incoming webhook
3. Verify the message appears in the unified chat at `/staff/unified-chat`

### 8.2 Reply from Unified Chat

1. Open the unified chat interface
2. Find the conversation from the test message
3. Send a reply
4. Verify the message is delivered to the customer's WhatsApp

### 8.3 Check Logs

Monitor logs to verify the integration:

```sql
-- Check webhook logs in Supabase
SELECT * FROM meta_webhook_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check conversations
SELECT * FROM meta_conversations
WHERE platform = 'whatsapp'
ORDER BY updated_at DESC;

-- Check messages
SELECT * FROM meta_messages
WHERE conversation_id IN (
  SELECT id FROM meta_conversations WHERE platform = 'whatsapp'
)
ORDER BY created_at DESC LIMIT 20;
```

---

## Troubleshooting

### Common Issues and Solutions

#### "WhatsApp phone number ID not configured"

**Cause**: `META_WA_PHONE_NUMBER_ID` environment variable is not set.

**Solution**:
1. Add the variable to your `.env` file
2. Add to Vercel environment variables
3. Restart your application

#### Webhook not receiving messages

**Possible causes**:
1. Webhook URL not configured correctly
2. Webhook verification failed
3. Not subscribed to `messages` field

**Solutions**:
1. Verify your webhook URL is publicly accessible via HTTPS
2. Check that `META_WEBHOOK_VERIFY_TOKEN` matches in your app and Meta settings
3. Go to WhatsApp > Configuration and ensure `messages` is subscribed

#### "Access token does not have permission"

**Cause**: Your access token doesn't have WhatsApp permissions.

**Solution**:
1. Generate a new System User token
2. Include `whatsapp_business_messaging` permission
3. Update `META_PAGE_ACCESS_TOKEN` in your environment

#### Messages not sending (24-hour window error)

**Cause**: WhatsApp requires customers to initiate conversations.

**Solution**:
- You can only send free-form messages within 24 hours of the customer's last message
- After 24 hours, you must use an approved message template
- See [WhatsApp Messaging Rules](#whatsapp-messaging-rules) below

#### Webhook signature verification failed

**Cause**: App secret doesn't match.

**Solution**:
1. Go to your Meta App > **App Settings** > **Basic**
2. Copy the **App Secret**
3. Update `META_APP_SECRET` in your environment

---

## WhatsApp Messaging Rules

### 24-Hour Messaging Window

WhatsApp has strict rules about business messaging:

| Scenario | Rules |
|----------|-------|
| **Customer messages first** | You can reply with any message for 24 hours |
| **After 24 hours** | Must use an approved message template |
| **No prior conversation** | Must use an approved message template |

### Message Templates

To send messages outside the 24-hour window:

1. Go to WhatsApp Manager > **Message Templates**
2. Create a new template
3. Submit for approval (usually 24-48 hours)
4. Use the template in your code

### Supported Message Types

| Type | Within 24h | Outside 24h |
|------|------------|-------------|
| Text | Yes | Template only |
| Image | Yes | No |
| Document | Yes | No |
| Video | Yes | No |
| Audio | Yes | No |
| Location | Yes | No |
| Template | Yes | Yes |

---

## Quick Reference

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST https://graph.facebook.com/v18.0/{phone-number-id}/messages` | Send messages |
| `POST https://graph.facebook.com/v18.0/{phone-number-id}/media` | Upload media |
| `GET/POST https://your-domain.com/api/meta/webhook` | Receive webhooks |

### Key Files in Codebase

| File | Purpose |
|------|---------|
| `/app/api/meta/webhook/route.ts` | Webhook handler |
| `/app/api/meta/send-message/route.ts` | Message sending API |
| `/src/lib/meta/webhook-handler.ts` | Event processing |
| `/src/lib/meta/signature-validator.ts` | Signature verification |

### Useful Links

- [Meta Business Suite](https://business.facebook.com)
- [Meta for Developers](https://developers.facebook.com)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Webhook Testing Tool](https://developers.facebook.com/tools/webhooks/)

---

## Summary Checklist

- [ ] Meta Business Account created and verified
- [ ] Meta Developer App created
- [ ] WhatsApp product added to app
- [ ] Phone number verified and registered
- [ ] Phone Number ID obtained
- [ ] Webhook URL configured and verified
- [ ] Access token generated with WhatsApp permissions
- [ ] `META_WA_PHONE_NUMBER_ID` added to environment
- [ ] Test message sent and received
- [ ] Reply sent from unified chat successfully

---

*Last updated: January 2025*
