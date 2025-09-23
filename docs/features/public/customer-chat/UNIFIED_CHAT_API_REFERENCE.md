# Unified Chat System API Reference

**Complete API Documentation for the Multi-Channel Chat System**
*Last Updated: September 2025*

## 📋 Overview

The Unified Chat System provides a comprehensive set of REST API endpoints for managing conversations, messages, and customer interactions across LINE and website channels. All endpoints follow RESTful conventions and return JSON responses.

## 🔗 Base URLs

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## 🔐 Authentication

All API endpoints require authentication. The system supports two authentication methods:

### Session-Based Authentication (Production)
```http
GET /api/conversations
Cookie: next-auth.session-token=<session-token>
```

### Bearer Token Authentication (Development)
```http
GET /api/conversations
Authorization: Bearer <development-token>
```

Get development token:
```bash
curl http://localhost:3000/api/dev-token
```

## 📡 Unified Conversation API

### Get All Conversations
Retrieve all conversations across LINE and website channels.

```http
GET /api/conversations
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `channel` | string | all | Filter by channel: `line`, `website`, `all` |
| `includeInactive` | boolean | false | Include inactive conversations |
| `limit` | number | 50 | Maximum conversations to return |
| `offset` | number | 0 | Number of conversations to skip |

#### Response Format
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_123",
      "channel_type": "line",
      "channel_user_id": "line_user_456",
      "customer_id": "cust_789",
      "last_message_at": "2025-09-23T10:30:00Z",
      "last_message_text": "Hello, I'd like to book a session",
      "last_message_by": "user",
      "unread_count": 2,
      "is_active": true,
      "created_at": "2025-09-20T09:00:00Z",
      "channel_metadata": {
        "display_name": "John Doe",
        "picture_url": "https://...",
        "customer_name": "John Doe"
      }
    }
  ],
  "total": 25,
  "hasMore": false
}
```

#### Error Responses
```json
{
  "success": false,
  "error": "Unauthorized access",
  "code": "AUTH_REQUIRED"
}
```

### Get Conversation Messages
Retrieve messages for a specific conversation.

```http
GET /api/conversations/{conversationId}/messages
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | ✅ | Unique conversation identifier |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Maximum messages to return |
| `before` | string | null | Get messages before this message ID |
| `after` | string | null | Get messages after this message ID |

#### Response Format
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "conversation_id": "conv_123",
      "channel_type": "line",
      "content": "Hello, I'd like to book a session",
      "content_type": "text",
      "sender_type": "user",
      "sender_name": "John Doe",
      "is_read": true,
      "created_at": "2025-09-23T10:30:00Z",
      "channel_metadata": {
        "line_message_id": "line_msg_456",
        "reply_token": "reply_789"
      }
    }
  ],
  "hasMore": true,
  "nextCursor": "msg_124"
}
```

## 💬 Message Operations API

### Send Message
Send a message to a conversation (unified endpoint for all channels).

```http
POST /api/conversations/{conversationId}/messages
```

#### Request Body
```json
{
  "content": "Thank you for your inquiry. I'll help you book a session.",
  "content_type": "text",
  "sender_name": "Staff Member",
  "reply_to_message_id": "msg_123"
}
```

#### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Message content |
| `content_type` | string | ✅ | Type: `text`, `image`, `file` |
| `sender_name` | string | ✅ | Name of staff member sending |
| `reply_to_message_id` | string | ❌ | ID of message being replied to |

#### Response Format
```json
{
  "success": true,
  "message": {
    "id": "msg_124",
    "conversation_id": "conv_123",
    "content": "Thank you for your inquiry...",
    "created_at": "2025-09-23T10:35:00Z",
    "delivery_status": "sent"
  }
}
```

### Upload File
Upload a file for sending in a conversation.

```http
POST /api/conversations/{conversationId}/upload
Content-Type: multipart/form-data
```

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | File to upload |
| `sender_name` | string | ✅ | Name of staff member |

#### Response Format
```json
{
  "success": true,
  "message": {
    "id": "msg_125",
    "conversation_id": "conv_123",
    "content_type": "file",
    "file_url": "https://storage.example.com/files/...",
    "file_name": "booking_form.pdf",
    "file_size": 245760,
    "created_at": "2025-09-23T10:40:00Z"
  }
}
```

## 📱 LINE-Specific API

### LINE Webhook Handler
Handle incoming LINE messages and events.

```http
POST /api/line/webhook
Content-Type: application/json
X-Line-Signature: <signature>
```

#### Webhook Events
```json
{
  "events": [
    {
      "type": "message",
      "timestamp": 1695465000000,
      "source": {
        "type": "user",
        "userId": "line_user_456"
      },
      "message": {
        "type": "text",
        "id": "line_msg_789",
        "text": "Hello"
      },
      "replyToken": "reply_token_123"
    }
  ]
}
```

### Send LINE Message
Send a message directly via LINE API.

```http
POST /api/line/conversations/{conversationId}/send
```

#### Request Body
```json
{
  "content": "Your booking has been confirmed!",
  "messageType": "text",
  "senderName": "Staff Member"
}
```

#### Response Format
```json
{
  "success": true,
  "messageId": "msg_126",
  "lineMessageId": "line_msg_890",
  "deliveryStatus": "sent"
}
```

### Mark LINE Conversation as Read
Mark a LINE conversation as read.

```http
PUT /api/line/conversations/{conversationId}
```

#### Request Body
```json
{
  "action": "mark_read"
}
```

## 🌐 Website Chat API

### Send Website Message
Send a message to a website chat conversation.

```http
POST /api/conversations/website/send-message
```

#### Request Body
```json
{
  "conversationId": "conv_123",
  "sessionId": "session_456",
  "messageText": "Thank you for contacting us!",
  "senderType": "staff",
  "senderName": "Staff Member"
}
```

#### Response Format
```json
{
  "success": true,
  "message": {
    "id": "msg_127",
    "conversation_id": "conv_123",
    "session_id": "session_456",
    "message_text": "Thank you for contacting us!",
    "sender_type": "staff",
    "created_at": "2025-09-23T10:45:00Z"
  }
}
```

### Mark Website Conversation as Read
Mark a website conversation as read.

```http
PUT /api/conversations/website/{conversationId}/mark-read
```

#### Response Format
```json
{
  "success": true,
  "message": "Conversation marked as read"
}
```

## 👥 Customer Management API

### Link Customer to Conversation
Associate a customer with a LINE user or website session.

```http
POST /api/line/users/link-customer
```

#### Request Body
```json
{
  "customerId": "cust_789",
  "conversationId": "conv_123"
}
```

#### Response Format
```json
{
  "success": true,
  "message": "Customer linked successfully",
  "linkedCustomer": {
    "id": "cust_789",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get Customer Details
Retrieve comprehensive customer information.

```http
GET /api/line/customers/{customerId}/details
```

#### Response Format
```json
{
  "success": true,
  "customer": {
    "id": "cust_789",
    "name": "John Doe",
    "code": "CUST001",
    "phone": "+1234567890",
    "email": "john@example.com",
    "lifetimeValue": 1250.00,
    "totalVisits": 15,
    "lastVisitDate": "2025-09-20"
  },
  "bookings": [
    {
      "id": "booking_123",
      "date": "2025-09-25",
      "start_time": "14:00",
      "duration": 1,
      "bay": "Bay 3",
      "number_of_people": 2,
      "status": "confirmed"
    }
  ],
  "packages": [
    {
      "id": "pkg_456",
      "package_type_name": "Golf Lessons - 10 Hours",
      "remaining_hours": 7,
      "expiration_date": "2025-12-31",
      "status": "active"
    }
  ],
  "transactions": [
    {
      "id": "txn_789",
      "transaction_date": "2025-09-20",
      "total_amount": 150.00,
      "payment_method": "credit_card",
      "receipt_number": "RCP001"
    }
  ]
}
```

## 📋 Template Management API

### Get Message Templates
Retrieve available message templates.

```http
GET /api/line/templates
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | all | Filter by category |
| `active` | boolean | true | Include only active templates |

#### Response Format
```json
{
  "success": true,
  "templates": [
    {
      "id": "tpl_123",
      "title": "Booking Confirmation",
      "category": "booking",
      "content": "Your booking for {date} at {time} has been confirmed.",
      "variables": ["date", "time"],
      "is_active": true
    }
  ]
}
```

### Send Template Message
Send a message using a template.

```http
POST /api/line/templates/{templateId}/send
```

#### Request Body
```json
{
  "conversationId": "conv_123",
  "variables": {
    "date": "September 25, 2025",
    "time": "2:00 PM"
  },
  "senderName": "Staff Member"
}
```

## 📊 Booking Integration API

### Send Booking Confirmation
Send a booking confirmation message.

```http
POST /api/line/bookings/{bookingId}/send-confirmation
```

#### Request Body
```json
{
  "messageFormat": "flex",
  "senderName": "Staff Member"
}
```

#### Response Format
```json
{
  "success": true,
  "message": "Booking confirmation sent successfully",
  "messageId": "msg_128",
  "bookingDetails": {
    "id": "booking_123",
    "date": "2025-09-25",
    "time": "14:00",
    "customer": "John Doe"
  }
}
```

## 🔄 Real-time Events

### WebSocket Connection
Connect to real-time message updates.

```javascript
// Connect to Supabase real-time
const supabase = createClient(url, key);
const channel = supabase.channel('unified-chat');

// Subscribe to message updates
channel
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'line_messages'
  }, (payload) => {
    console.log('New LINE message:', payload.new);
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'web_chat_messages'
  }, (payload) => {
    console.log('New website message:', payload.new);
  })
  .subscribe();
```

### Real-time Event Types

#### New Message Event
```json
{
  "event": "new_message",
  "payload": {
    "id": "msg_129",
    "conversation_id": "conv_123",
    "channel_type": "line",
    "content": "New message content",
    "sender_type": "user",
    "created_at": "2025-09-23T11:00:00Z"
  }
}
```

#### Conversation Update Event
```json
{
  "event": "conversation_update",
  "payload": {
    "conversation_id": "conv_123",
    "last_message_at": "2025-09-23T11:00:00Z",
    "last_message_text": "New message content",
    "unread_count": 3
  }
}
```

#### Typing Indicator Event
```json
{
  "event": "typing",
  "payload": {
    "conversation_id": "conv_123",
    "user_id": "user_456",
    "typing": true,
    "timestamp": "2025-09-23T11:00:00Z"
  }
}
```

## ❌ Error Handling

### Error Response Format
All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "field_name",
    "reason": "validation_failed"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `EXTERNAL_API_ERROR` | 502 | External service error |

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "content": {
      "code": "required",
      "message": "Content is required"
    },
    "content_type": {
      "code": "invalid_value",
      "message": "Content type must be one of: text, image, file"
    }
  }
}
```

## 🔧 Rate Limiting

The API implements rate limiting to ensure fair usage:

### Rate Limits
- **Message Sending**: 60 messages per minute per user
- **File Uploads**: 10 uploads per minute per user
- **API Queries**: 1000 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1695465660
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retry_after": 60
}
```

## 📈 API Usage Examples

### Complete Message Flow Example

```typescript
// 1. Get all conversations
const conversations = await fetch('/api/conversations')
  .then(res => res.json());

// 2. Select a conversation and get messages
const messages = await fetch(`/api/conversations/${conversationId}/messages`)
  .then(res => res.json());

// 3. Send a response message
const newMessage = await fetch(`/api/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Thank you for your message!',
    content_type: 'text',
    sender_name: 'Staff Member'
  })
}).then(res => res.json());

// 4. Mark conversation as read
await fetch(`/api/conversations/${conversationId}/mark-read`, {
  method: 'PUT'
});
```

### File Upload Example

```typescript
// Upload and send file
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('sender_name', 'Staff Member');

const fileMessage = await fetch(`/api/conversations/${conversationId}/upload`, {
  method: 'POST',
  body: formData
}).then(res => res.json());
```

### Customer Linking Example

```typescript
// Link customer to conversation
const linkResult = await fetch('/api/line/users/link-customer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'cust_789',
    conversationId: conversationId
  })
}).then(res => res.json());

// Get detailed customer information
const customerDetails = await fetch(`/api/line/customers/${customerId}/details`)
  .then(res => res.json());
```

## 🧪 Testing

### Development Token
```bash
# Get development token for testing
curl http://localhost:3000/api/dev-token

# Use token in subsequent requests
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/conversations
```

### Test Data Creation
```typescript
// Create test conversation
const testConversation = await fetch('/api/conversations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <dev-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel_type: 'website',
    channel_user_id: 'test_session_123',
    customer_id: 'test_customer_456'
  })
});
```

---

*This API reference provides comprehensive documentation for all Unified Chat System endpoints. For implementation examples, see the [Development Guide](./UNIFIED_CHAT_DEVELOPMENT_GUIDE.md).*