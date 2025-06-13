# LINE Messaging Integration Documentation

## Overview

The Lengolf Forms system integrates with LINE Messaging API to provide automated notifications and reports to different groups. This integration enables real-time communication for booking confirmations, cancellations, inventory updates, and special event notifications.

## Architecture

### LINE Bot Configuration

The system uses LINE's Messaging API to send notifications to multiple groups:

- **Default Group**: General booking notifications and system updates
- **Coaching Group**: Coaching-related bookings and special events
- **Ratchavin Group**: Specific staff notifications and VIP customer alerts

### Integration Components

#### 1. LINE API Configuration
- **Channel Access Token**: Stored in environment variables
- **Channel Secret**: Used for webhook verification
- **Group Tokens**: Different tokens for different LINE groups
- **Webhook URL**: `/api/line/webhook` endpoint

#### 2. Message Types

##### Booking Notifications
- **New Booking**: Customer details, date/time, bay assignment
- **Booking Cancellation**: Cancellation reason, refund status
- **Booking Modification**: Changes made to existing bookings
- **Package Usage**: Package hour consumption notifications

##### Inventory Reports
- **Daily Inventory**: Stock levels, low stock alerts
- **Weekly Summary**: Comprehensive inventory status
- **Reorder Alerts**: Products below threshold
- **Staff Submissions**: Daily inventory input tracking

##### Special Events
- **US Open Scores**: Employee score submissions and screenshots
- **VIP Customer Alerts**: High-value customer booking notifications
- **System Alerts**: Technical issues, integration failures

## Implementation Details

### Environment Variables

```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LINE Group Tokens
LINE_GROUP_TOKEN_DEFAULT=default_group_token
LINE_GROUP_TOKEN_COACHING=coaching_group_token
LINE_GROUP_TOKEN_RATCHAVIN=ratchavin_group_token
```

### API Endpoints

#### 1. Webhook Endpoint
```
POST /api/line/webhook
```

**Purpose**: Receives incoming messages from LINE platform
**Authentication**: Channel signature verification
**Payload**: LINE webhook event data

#### 2. Send Message Endpoint
```
POST /api/line/send-message
```

**Purpose**: Internal API for sending messages to LINE groups
**Authentication**: Internal API key
**Payload**:
```json
{
  "group": "default|coaching|ratchavin",
  "message": "string",
  "type": "text|image|flex"
}
```

### Message Templates

#### Booking Confirmation Template
```
🏌️ New Booking Confirmed

Customer: {name}
Email: {email}
Phone: {phone}
Date: {date}
Time: {start_time} - {end_time}
Bay: {bay}
Duration: {duration} hours
Guests: {number_of_people}
Package: {package_name}

Booking ID: {booking_id}
```

#### Cancellation Template
```
❌ Booking Cancelled

Customer: {name}
Original Date: {date}
Time: {start_time} - {end_time}
Bay: {bay}
Reason: {cancellation_reason}
Cancelled by: {cancelled_by}

Booking ID: {booking_id}
```

#### Inventory Alert Template
```
📦 Low Stock Alert

Product: {product_name}
Category: {category}
Current Stock: {current_stock}
Threshold: {reorder_threshold}
Supplier: {supplier}

Action Required: Reorder needed
```

### Message Routing Logic

#### Group Selection Rules

1. **Default Group**: All general booking notifications
2. **Coaching Group**: 
   - Coaching package bookings
   - Professional lesson bookings
   - Tournament notifications
3. **Ratchavin Group**: 
   - VIP customer bookings
   - High-value transactions
   - System critical alerts

#### Message Priority Levels

- **Critical**: System failures, payment issues
- **High**: Booking confirmations, cancellations
- **Medium**: Inventory alerts, package updates
- **Low**: Daily reports, statistics

### Error Handling

#### Retry Mechanism
- **Initial Attempt**: Immediate message send
- **Retry Logic**: Exponential backoff (2s, 4s, 8s)
- **Maximum Retries**: 3 attempts
- **Fallback**: Email notification to admin

#### Error Types
- **API Rate Limit**: 429 response handling
- **Invalid Token**: Token refresh mechanism
- **Network Timeout**: Retry with longer timeout
- **Message Too Long**: Automatic message splitting

### Database Integration

#### Logging Tables
- **line_message_logs**: All sent messages with status
- **line_webhook_logs**: Incoming webhook events
- **line_error_logs**: Failed message attempts

#### Message History
```sql
CREATE TABLE line_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_type TEXT NOT NULL,
    message_type TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent', 'failed', 'retry'
    line_message_id TEXT,
    related_booking_id TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing and Monitoring

### Health Check Endpoint
```
GET /api/line/health
```

**Response**:
```json
{
  "status": "healthy",
  "groups": {
    "default": "connected",
    "coaching": "connected", 
    "ratchavin": "connected"
  },
  "last_message_sent": "2024-01-01T10:00:00Z",
  "message_count_today": 45
}
```

### Monitoring Metrics

#### Message Delivery Metrics
- **Success Rate**: Percentage of successfully delivered messages
- **Average Delivery Time**: Time from trigger to delivery
- **Failed Message Count**: Daily failed message count
- **Retry Success Rate**: Percentage of messages delivered after retry

#### Group Activity Metrics
- **Messages per Group**: Daily message count by group
- **Response Time**: API response time tracking
- **Token Validity**: Token expiration monitoring

### Development Guidelines

#### Adding New Message Types

1. **Create Template**: Add message template in `/lib/line/templates/`
2. **Update Router**: Add routing logic in `/lib/line/router.ts`
3. **Add Trigger**: Implement trigger in relevant business logic
4. **Update Tests**: Add unit tests for new message type

#### Message Format Guidelines
- **Character Limit**: 2000 characters per message
- **Emoji Usage**: Consistent emoji for message types
- **Formatting**: Use consistent formatting for readability
- **Localization**: Support for Thai and English messages

## Security Considerations

### Token Management
- **Secure Storage**: Tokens stored in secure environment variables
- **Token Rotation**: Regular token rotation schedule
- **Access Control**: Limited access to LINE configuration

### Message Content
- **Data Sanitization**: Remove sensitive information
- **PII Protection**: Mask personal information in logs
- **Content Filtering**: Prevent malicious content injection

### Webhook Security
- **Signature Verification**: Verify LINE webhook signatures
- **Rate Limiting**: Prevent webhook abuse
- **IP Whitelisting**: Restrict webhook sources

## Troubleshooting

### Common Issues

#### Messages Not Sending
1. **Check Token Validity**: Verify access token is valid
2. **Verify Group Membership**: Ensure bot is in target group
3. **Check Rate Limits**: Verify API rate limit status
4. **Review Error Logs**: Check LINE error logs

#### Webhook Not Receiving
1. **Verify Webhook URL**: Confirm webhook URL is accessible
2. **Check SSL Certificate**: Ensure valid SSL certificate
3. **Review Signature**: Verify webhook signature validation
4. **Check Firewall**: Ensure ports are open

### Debug Mode

Enable debug mode by setting:
```bash
LINE_DEBUG_MODE=true
```

This will:
- Log all message content
- Show detailed API responses
- Enable webhook payload logging
- Provide detailed error messages

## API Reference

### LINE Messaging API Wrapper

#### `sendMessage(group, message, type)`
Sends a message to specified LINE group.

**Parameters**:
- `group`: Target group ('default', 'coaching', 'ratchavin')
- `message`: Message content
- `type`: Message type ('text', 'image', 'flex')

**Returns**: Promise with message ID

#### `sendBookingNotification(booking)`
Sends booking notification to appropriate groups.

**Parameters**:
- `booking`: Booking object with customer details

**Returns**: Promise with delivery status

#### `sendInventoryAlert(product, currentStock)`
Sends low stock alert notification.

**Parameters**:
- `product`: Product object
- `currentStock`: Current stock level

**Returns**: Promise with delivery status

## Integration Examples

### Booking Confirmation Integration
```typescript
// After successful booking creation
const booking = await createBooking(bookingData);

// Send LINE notification
await sendBookingNotification({
  type: 'confirmation',
  booking: booking,
  group: determineGroup(booking.package_name)
});
```

### Inventory Alert Integration
```typescript
// Check stock levels daily
const lowStockProducts = await checkStockLevels();

for (const product of lowStockProducts) {
  await sendInventoryAlert(product, product.current_stock);
}
```

### Custom Message Integration
```typescript
// Send custom message to specific group
await sendMessage('coaching', 
  `🏌️ Tournament Registration Open\n\nRegister now for the monthly tournament!`, 
  'text'
);
```

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Token Refresh**: Monthly token validation and refresh
2. **Log Cleanup**: Weekly cleanup of old message logs
3. **Group Membership**: Verify bot membership in groups
4. **Rate Limit Monitoring**: Check API usage patterns

### Update Procedures

1. **Template Updates**: Modify message templates
2. **Group Configuration**: Add/remove LINE groups
3. **API Changes**: Update to new LINE API versions
4. **Feature Additions**: Add new message types or features

### Backup and Recovery

- **Configuration Backup**: Regular backup of LINE configuration
- **Message History**: Maintain message history for auditing
- **Recovery Procedures**: Documented recovery processes

## Performance Optimization

### Message Batching
- **Batch Processing**: Group multiple messages
- **Queue Management**: Implement message queue for high volume
- **Rate Limiting**: Respect LINE API rate limits

### Caching Strategy
- **Group Info Cache**: Cache group information
- **Template Cache**: Cache compiled message templates
- **Token Cache**: Cache valid tokens

## Compliance and Regulations

### Data Privacy
- **PDPA Compliance**: Ensure Thai data protection compliance
- **Message Retention**: Defined retention policies
- **Consent Management**: Track messaging consent

### LINE Platform Compliance
- **Terms of Service**: Adherence to LINE ToS
- **Usage Guidelines**: Follow LINE usage guidelines
- **Content Policies**: Comply with content policies

## Future Enhancements

### Planned Features
- **Rich Messages**: Flex Message implementation
- **Interactive Messages**: Button and carousel messages
- **Message Scheduling**: Delayed message sending
- **Analytics Dashboard**: Message performance analytics

### Technical Improvements
- **Message Queue**: Implement Redis-based message queue
- **Load Balancing**: Distribute message sending load
- **Monitoring**: Enhanced monitoring and alerting
- **Localization**: Multi-language message support 