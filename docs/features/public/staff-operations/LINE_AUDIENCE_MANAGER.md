# LINE Audience Manager

Complete audience management and broadcast messaging system for LINE contacts with rich Flex Messages and opt-out functionality.

## Overview

The LINE Audience Manager allows staff to:
- Create and manage audience groups (manual selection or criteria-based)
- Send rich, interactive Flex Messages with clickable buttons
- Track broadcast delivery with detailed analytics
- Handle user opt-outs automatically
- Schedule recurring broadcasts (e.g., weekly coaching reminders)

## Database Schema

### Core Tables

**`line_audiences`** - Audience definitions
- `id` - UUID primary key
- `name` - Audience name
- `type` - 'manual' | 'criteria' | 'upload'
- `criteria_json` - Filter definition for auto-audiences
- `allow_opt_out` - Enable/disable opt-out button
- `is_active` - Active status

**`line_audience_members`** - Member tracking
- `audience_id` - FK to line_audiences
- `line_user_id` - FK to line_users
- `customer_id` - FK to customers
- `opted_out` - Opt-out status
- `opted_out_at` - Opt-out timestamp

**`line_broadcast_campaigns`** - Campaign management
- `id` - UUID primary key
- `name` - Campaign name
- `audience_id` - Target audience
- `message_type` - 'text' | 'flex'
- `flex_message` - Flex message JSON
- `status` - 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
- `schedule_type` - 'immediate' | 'scheduled' | 'recurring'
- `total_recipients`, `success_count`, `error_count` - Metrics

**`line_broadcast_logs`** - Delivery tracking
- `campaign_id` - FK to campaigns
- `line_user_id` - Recipient
- `status` - 'success' | 'failed' | 'opted_out' | 'blocked'
- `error_message` - Failure reason
- `line_message_id` - LINE API message ID

**`line_flex_templates`** - Reusable templates
- `id` - UUID primary key
- `name` - Template name
- `category` - 'reminder' | 'promotion' | 'notification' | 'booking'
- `flex_json` - Full flex message structure
- `variables` - Available variables (e.g., {{customer_name}})
- `has_opt_out_button` - Auto opt-out button

## API Endpoints

### Audience Management

```bash
# List all audiences
GET /api/line/audiences

# Create audience
POST /api/line/audiences
{
  "name": "Customers with Coaching Hours",
  "type": "criteria",
  "criteria_json": { "type": "coaching_hours" },
  "allow_opt_out": true
}

# Get audience details with members
GET /api/line/audiences/{id}

# Update audience
PATCH /api/line/audiences/{id}
{
  "name": "Updated Name",
  "is_active": false
}

# Delete audience
DELETE /api/line/audiences/{id}

# Sync criteria-based audience
POST /api/line/audiences/{id}/sync

# Preview audience size
POST /api/line/audiences/preview
{
  "criteria_json": { "type": "coaching_hours" }
}
```

### Broadcast Campaigns

```bash
# List campaigns
GET /api/line/campaigns
GET /api/line/campaigns?status=completed
GET /api/line/campaigns?audience_id={uuid}

# Create campaign
POST /api/line/campaigns
{
  "name": "Weekly Coaching Reminder",
  "audience_id": "{uuid}",
  "message_type": "flex",
  "flex_message": { /* flex JSON */ },
  "schedule_type": "immediate"
}

# Get campaign details
GET /api/line/campaigns/{id}

# Send campaign
POST /api/line/campaigns/{id}/send

# Get delivery logs
GET /api/line/campaigns/{id}/logs
GET /api/line/campaigns/{id}/logs?status=failed&limit=50

# Update campaign
PATCH /api/line/campaigns/{id}
{
  "status": "cancelled"
}

# Delete campaign
DELETE /api/line/campaigns/{id}
```

### Flex Templates

```bash
# List templates
GET /api/line/flex-templates
GET /api/line/flex-templates?category=reminder&is_active=true

# Create template
POST /api/line/flex-templates
{
  "name": "Coaching Reminder",
  "category": "reminder",
  "flex_json": { /* flex message */ },
  "variables": ["customer_name", "coaching_hours"],
  "has_opt_out_button": true
}

# Get template
GET /api/line/flex-templates/{id}

# Update template
PATCH /api/line/flex-templates/{id}

# Delete template
DELETE /api/line/flex-templates/{id}
```

## Testing Guide

### 1. Create Test Audience

```bash
curl -X POST http://localhost:3000/api/line/audiences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Coaching Hours Audience",
    "type": "criteria",
    "criteria_json": {"type": "coaching_hours"},
    "allow_opt_out": true
  }'
```

Expected response:
```json
{
  "success": true,
  "audience": {
    "id": "uuid-here",
    "name": "Test Coaching Hours Audience",
    "type": "criteria",
    ...
  }
}
```

### 2. Preview Audience Size

```bash
curl -X POST http://localhost:3000/api/line/audiences/preview \
  -H "Content-Type: application/json" \
  -d '{
    "criteria_json": {"type": "coaching_hours"}
  }'
```

Expected response:
```json
{
  "success": true,
  "estimated_size": 15,
  "criteria": {"type": "coaching_hours"}
}
```

### 3. Get Flex Template

```bash
curl http://localhost:3000/api/line/flex-templates?category=reminder
```

Expected response includes the seed "Weekly Coaching Hours Reminder" template.

### 4. Create and Send Campaign

```bash
# Get template ID from previous step
TEMPLATE_ID="bba772e0-e854-4604-92ce-e54b9a8c5b1b"
AUDIENCE_ID="uuid-from-step-1"

# Get template flex JSON
curl http://localhost:3000/api/line/flex-templates/$TEMPLATE_ID > template.json

# Create campaign
curl -X POST http://localhost:3000/api/line/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Coaching Reminder",
    "audience_id": "'$AUDIENCE_ID'",
    "message_type": "flex",
    "flex_message": '$(cat template.json | jq -r '.template.flex_json')',
    "schedule_type": "immediate"
  }' > campaign.json

# Get campaign ID
CAMPAIGN_ID=$(cat campaign.json | jq -r '.campaign.id')

# Send campaign
curl -X POST http://localhost:3000/api/line/campaigns/$CAMPAIGN_ID/send
```

Expected response:
```json
{
  "success": true,
  "message": "Broadcast started",
  "total_recipients": 15,
  "campaign_id": "uuid-here"
}
```

### 5. Monitor Campaign Progress

```bash
# Check campaign status
curl http://localhost:3000/api/line/campaigns/$CAMPAIGN_ID

# View delivery logs
curl http://localhost:3000/api/line/campaigns/$CAMPAIGN_ID/logs

# View failed deliveries
curl "http://localhost:3000/api/line/campaigns/$CAMPAIGN_ID/logs?status=failed"
```

### 6. Test Opt-Out Flow

1. Send campaign to test LINE user
2. Click "ยกเลิกการแจ้งเตือน" button in LINE app
3. Verify opt-out in database:

```bash
curl http://localhost:3000/api/line/audiences/$AUDIENCE_ID
```

Should show opted_out_count incremented.

4. Verify opt-out confirmation message received in LINE

## Flex Message Structure

### Coaching Hours Reminder Template

```json
{
  "type": "bubble",
  "hero": {
    "type": "box",
    "layout": "vertical",
    "contents": [{
      "type": "text",
      "text": "⛳ Golf Coaching",
      "weight": "bold",
      "size": "xl",
      "color": "#FFFFFF"
    }],
    "backgroundColor": "#1DB446",
    "paddingAll": "20px"
  },
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": "สวัสดีค่า {{customer_name}}",
        "size": "md"
      },
      {
        "type": "separator",
        "margin": "lg"
      },
      {
        "type": "box",
        "layout": "vertical",
        "margin": "lg",
        "contents": [
          {
            "type": "text",
            "text": "คุณมีชั่วโมงโค้ชกอล์ฟคงเหลือ",
            "size": "sm",
            "color": "#999999"
          },
          {
            "type": "text",
            "text": "{{coaching_hours}} ชั่วโมง",
            "size": "xxl",
            "weight": "bold",
            "color": "#1DB446"
          }
        ]
      },
      {
        "type": "text",
        "text": "อย่าลืมจองคิวโค้ชกอล์ฟกับเราได้นะคะ! 📅",
        "size": "sm",
        "margin": "lg",
        "wrap": true
      }
    ]
  },
  "footer": {
    "type": "box",
    "layout": "vertical",
    "spacing": "sm",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "color": "#1DB446",
        "action": {
          "type": "uri",
          "label": "📅 จองคิวโค้ช",
          "uri": "https://len.golf/create-booking"
        }
      },
      {
        "type": "button",
        "style": "link",
        "action": {
          "type": "postback",
          "label": "ยกเลิกการแจ้งเตือน",
          "data": "action=opt_out&campaign_id={{campaign_id}}&audience_id={{audience_id}}",
          "displayText": "ขอยกเลิกการรับข้อความ"
        }
      }
    ]
  }
}
```

### Variable Substitution

Variables are replaced before sending:
- `{{customer_name}}` → Customer's name from database
- `{{coaching_hours}}` → Remaining coaching hours
- `{{campaign_id}}` → Campaign UUID (for opt-out tracking)
- `{{audience_id}}` → Audience UUID (for opt-out)

## Opt-Out Implementation

### Postback Data Format
```
action=opt_out&campaign_id={uuid}&audience_id={uuid}
```

### Webhook Handler

Located in `src/lib/line/webhook-handler.ts`:

```typescript
case 'opt_out': {
  const audienceId = params.get('audience_id');
  const campaignId = params.get('campaign_id');

  // Update database
  await supabase.rpc('handle_audience_opt_out', {
    p_audience_id: audienceId,
    p_line_user_id: event.source.userId
  });

  // Log opt-out
  await supabase.from('line_broadcast_logs').insert({
    campaign_id: campaignId,
    line_user_id: event.source.userId,
    status: 'opted_out'
  });

  // Send confirmation
  responseMessage = '✅ คุณได้ยกเลิกการรับข้อความจากกลุ่มนี้เรียบร้อยแล้วค่ะ';
  break;
}
```

## Rate Limiting

### LINE API Limits
- **Push Messages**: 500 messages per minute
- **Implementation**: 150ms delay between messages (400 msg/min, safe margin)

### Batch Processing
```typescript
// Send in batches with delays
for (let i = 0; i < members.length; i++) {
  await sendLineMessage(member.line_user_id, message);

  // Rate limiting delay
  if (i < members.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // Progress update every 10 messages
  if ((i + 1) % 10 === 0) {
    await updateCampaignProgress();
  }
}
```

## Database Functions

### `get_customers_with_coaching_hours()`
Returns customers with active coaching packages and LINE user IDs.

### `calculate_audience_size(criteria_json)`
Preview how many members match given criteria.

### `sync_audience_members(p_audience_id)`
Auto-populate criteria-based audience with current matches.

### `get_audience_stats(p_audience_id)`
Returns total_members, opted_out_count, active_members, opt_out_rate.

### `get_campaign_stats(p_campaign_id)`
Returns delivery metrics: success/error/opted_out counts and rates.

### `handle_audience_opt_out(p_audience_id, p_line_user_id)`
Mark user as opted out in audience.

### `get_active_audience_members(p_audience_id)`
Returns non-opted-out members with customer details.

## Error Handling

### Message Sending
- **User Not Found (404)**: Skip, log as failed
- **User Blocked (403)**: Skip, log as blocked
- **Network Error**: Retry up to 3 times with exponential backoff
- **Rate Limit**: Built-in 150ms delays prevent hitting limits

### Campaign Status
- `draft` - Created but not sent
- `scheduled` - Scheduled for future
- `sending` - Currently being sent
- `completed` - Successfully completed
- `failed` - Critical error occurred

## Security

### Access Control
- Staff-only access (`is_staff = true`)
- All endpoints check authentication
- Audit trail via `created_by` field

### Opt-Out Compliance
- Immediate effect (no delay)
- Cannot be undone programmatically
- Staff must manually re-add user
- Opt-out tracked with timestamp

## Performance

### Audience Sync
- Criteria audiences auto-sync on creation
- Manual sync available via API
- Indexed queries for fast lookups

### Campaign Sending
- Background processing (non-blocking)
- Progress updates every 10 messages
- Real-time stats in database

### Monitoring
- Campaign status tracking
- Delivery logs with error messages
- Success/error rates calculated

## Next Steps

1. **UI Components** - Build audience manager interface
2. **Campaign Dashboard** - Visual analytics
3. **Scheduled Jobs** - Cron for recurring campaigns
4. **Advanced Filtering** - More criteria types
5. **A/B Testing** - Test message variations

## Related Documentation

- [LINE Messaging Integration](../../../integrations/LINE_MESSAGING_INTEGRATION.md)
- [Staff LINE Chat](./STAFF_LINE_CHAT.md)
- [Database Schema](../../../database/DATABASE_DOCUMENTATION_INDEX.md)
