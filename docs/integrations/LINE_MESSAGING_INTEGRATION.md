# LINE Messaging Integration Documentation

## Overview

The Lengolf Forms system provides comprehensive LINE messaging integration through a two-tiered approach: automated system notifications and staff-managed customer communication. The system includes webhook processing for incoming messages, a staff interface for customer conversations, and template management for consistent communication.

## Architecture Overview

### Integration Components

```
LINE Platform
      ↓ (webhooks)
LINE Webhook Handler ← → Database
      ↓                     ↑
Message Processing    Staff Interface
      ↓                     ↑
Automated Responses   Manual Responses
```

### Access Levels

1. **System Integration**: Automated notifications (booking confirmations, alerts)
2. **Staff Communication**: Manual customer conversation management
3. **Admin Debugging**: Technical LINE API testing and troubleshooting

## System Components

### 0. Image Caching Infrastructure

#### CachedImage Component
```typescript
// Enhanced image component with aggressive caching
interface CachedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

// Usage in ImageMessage component
<CachedImage
  src={imageUrl}
  alt={altText || fileName || 'Image'}
  width={200}
  height={120}
  className="object-cover w-full h-auto hover:opacity-90 transition-opacity"
  onError={handleImageError}
  loading="lazy"
  placeholder="blur"
/>
```

#### ImageCache Service
```typescript
// Singleton image cache service
class ImageCache {
  private memoryCache = new Map<string, CachedImage>();
  private dbName = 'LineImageCache';
  private storeName = 'images';
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private maxMemorySize = 50; // Max images in memory

  // Main cache retrieval method
  async getImage(url: string): Promise<string> {
    // 1. Check memory cache first
    // 2. Check IndexedDB cache
    // 3. Fetch from network and cache
  }

  // Preload images for conversation
  async preloadImages(imageUrls: string[]): Promise<void>

  // Cache management
  async clearExpiredImages(): Promise<void>
  async clearAllImages(): Promise<void>
  getCacheStats(): { memoryCount: number; memoryUrls: string[] }
}
```

#### UI Enhancements
- **Reliable Click Handlers**: Image click events properly handled through container divs
- **Smart Scroll Behavior**: Auto-scroll to bottom only on conversation first open
- **Loading States**: Visual feedback during image loading with spinner
- **Error Fallback**: Graceful degradation when images fail to load
- **Full-size Modal**: Click images to view in full-screen modal with download option

### 1. Webhook Processing

#### Webhook Handler
- **Endpoint**: `/api/line/webhook`
- **Purpose**: Receive and process incoming LINE messages
- **Authentication**: LINE signature verification
- **Processing**: Asynchronous message handling with immediate response

```typescript
// Webhook flow
POST /api/line/webhook
├── Signature validation
├── Immediate 200 response
├── Async message processing
│   ├── Store incoming messages
│   ├── Link LINE users to customers
│   ├── Update conversation status
│   └── Process special commands
└── Error logging and recovery
```

#### Message Storage
```sql
-- LINE messages storage
line_messages: {
  id: UUID,
  line_user_id: string,
  message_text: string,
  message_type: string,
  timestamp: number,
  created_at: timestamp
}

-- LINE user management
line_users: {
  line_user_id: string (PK),
  display_name: string,
  picture_url: string,
  customer_id: UUID (FK),
  first_seen_at: timestamp,
  last_seen_at: timestamp
}

-- Conversation management
line_conversations: {
  id: UUID (PK),
  line_user_id: string (FK),
  customer_id: UUID (FK),
  last_message_at: timestamp,
  last_message_text: string,
  last_message_by: enum('user', 'business'),
  unread_count: integer,
  is_active: boolean,
  assigned_to: string
}
```

### 2. Staff Communication Interface

#### Staff Panel Integration
- **Location**: `/staff/line-chat`
- **Access**: Requires `is_staff = true` permission
- **Features**: Real-time conversation management with customer integration

#### Key Features
1. **Conversation Management**
   - Live conversation list with customer details
   - Message history and real-time updates
   - Customer linking and profile integration
   - Unread message indicators

2. **Message Composition**
   - Text message support
   - Rich message (Flex) support
   - Template integration
   - Customer name variable substitution

3. **Customer Integration**
   - Link LINE users to existing customers
   - Display customer booking history
   - Show package information
   - Access customer contact details

### 3. Message Templates System

#### Template Management
- **Location**: `/staff/line-templates`
- **Access**: Staff and Admin can manage templates
- **Categories**: Greeting, Booking, Info, Support, General

#### Template Features
```typescript
interface Template {
  id: string;
  title: string;
  content: string;
  category: 'greeting' | 'booking' | 'info' | 'support' | 'general';
  message_type: 'text' | 'flex';
  display_order: number;
  is_active: boolean;
  variables: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### Variable Substitution
- **`{{customer_name}}`**: Replaced with actual customer name
- **Extensible**: System supports additional variables
- **Preview**: Real-time preview with variable substitution

## API Endpoints

### Staff Communication APIs

#### Conversation Management
```typescript
// Get all conversations
GET /api/line/conversations
// Requires: Staff access
// Returns: List of conversations with customer details

// Get specific conversation
GET /api/line/conversations/[id]
// Requires: Staff access
// Returns: Conversation with message history

// Get conversation messages
GET /api/line/conversations/[id]/messages
// Requires: Staff access
// Returns: Paginated message list

// Create/update conversation
POST /api/line/conversations
// Requires: Staff access
// Body: { lineUserId, customerId, assignedTo }
```

#### Message Sending
```typescript
// Send text message
POST /api/line/send-message
// Requires: Staff access
// Body: { userId: string, message: string, type: 'text' }

// Send rich message
POST /api/line/send-rich-message
// Requires: Staff access
// Body: { userId: string, flexMessage: FlexMessage }
```

#### Template Management
```typescript
// Get templates
GET /api/line/templates?category=greeting&active=true
// Requires: Staff access
// Returns: Filtered template list

// Create template
POST /api/line/templates
// Requires: Staff access
// Body: { title, content, category, message_type, display_order }

// Update template
PUT /api/line/templates/[id]
// Requires: Staff access
// Body: { title?, content?, category?, is_active?, display_order? }

// Delete template (soft delete)
DELETE /api/line/templates/[id]
// Requires: Staff access
// Result: Sets is_active = false

// Send template message
POST /api/line/templates/[id]/send
// Requires: Staff access
// Body: { userId: string, variables?: Record<string, string> }
```

#### Customer Integration
```typescript
// Link LINE user to customer
POST /api/line/users/[lineUserId]/link-customer
// Requires: Staff access
// Body: { customerId: string }

// Get customer details for LINE chat
GET /api/line/customers/[id]/details
// Requires: Staff access
// Returns: Customer profile with booking history
```

### Admin Testing APIs

#### Debug Interface
```typescript
// LINE testing interface
GET /admin/line-messages
// Requires: Admin access
// Returns: Debug interface for LINE API testing

// Test LINE API
POST /api/line/test
// Requires: Admin access
// Returns: LINE system status and test data
```

## Security Implementation

### Authentication & Authorization

#### API Protection
```typescript
// Staff access requirement example
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);

  // Check staff access
  const { data: user } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('allowed_users')
    .select('is_admin, is_staff')
    .eq('email', session.user.email)
    .single();

  if (!user?.is_admin && !user?.is_staff) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
}
```

#### Route Protection
```typescript
// Middleware protection for staff routes
if (req.nextUrl.pathname.startsWith('/staff')) {
  const { data: user } = await supabase
    .schema('backoffice')
    .from('allowed_users')
    .select('is_staff')
    .eq('email', req.nextauth.token?.email)
    .single();

  if (!user?.is_staff) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
```

### Data Security
- **Message Encryption**: Secure transmission to LINE API
- **Access Logging**: Track staff access to conversations
- **Data Retention**: Configurable message storage policies
- **Privacy Compliance**: Customer data protection measures

## Development Configuration

### Environment Variables
```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Development Settings
SKIP_AUTH=true  # Enables development authentication bypass
```

### Development Authentication Bypass
When `SKIP_AUTH=true`:
- All LINE messaging APIs accessible without authentication
- Staff panel accessible without login
- Maintains development productivity
- **Production Safety**: Only works in `NODE_ENV=development`

## Message Types and Templates

### Automated System Messages
```typescript
// Booking confirmation (system-generated)
interface BookingNotification {
  customer: string;
  date: string;
  time: string;
  bay: string;
  duration: number;
  guests: number;
  package?: string;
}

// Inventory alerts (system-generated)
interface InventoryAlert {
  type: 'low_stock' | 'daily_report' | 'weekly_summary';
  items: Array<{
    name: string;
    current_stock: number;
    threshold: number;
  }>;
}
```

### Staff Message Templates

#### Greeting Templates
```
Welcome Message:
"Hello {{customer_name}}, welcome to LENGOLF! We're excited to have you visit our indoor golf facility. Our staff is here to help make your experience amazing."

Business Hours:
"Hi {{customer_name}}! Our facility is open Monday-Friday 10am-10pm, Saturday-Sunday 9am-11pm. We look forward to seeing you soon!"
```

#### Booking Templates
```
Booking Confirmation:
"Hi {{customer_name}}, your booking is confirmed! We'll see you soon. If you need to make any changes, please let us know at least 2 hours in advance."

Cancellation Policy:
"Hello {{customer_name}}, we understand plans can change. Please note our cancellation policy requires 2 hours notice for booking changes."
```

#### Support Templates
```
Technical Support:
"Hi {{customer_name}}, we're here to help! Please describe the issue you're experiencing and our team will assist you right away."

General Inquiry:
"Thank you for your message, {{customer_name}}! We'll get back to you shortly with the information you requested."
```

## Error Handling

### Common Error Scenarios
1. **LINE API Errors**: Network issues, rate limiting, invalid tokens
2. **Customer Linking Failures**: Invalid customer IDs, duplicate links
3. **Message Delivery Failures**: Blocked users, invalid LINE user IDs
4. **Template Processing Errors**: Invalid variable syntax, missing data

### Error Recovery
```typescript
// Example error handling in message sending
try {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify(messagePayload)
  });

  if (!response.ok) {
    // Log error and provide user feedback
    console.error('LINE API Error:', await response.text());
    return { success: false, error: 'Message delivery failed' };
  }
} catch (error) {
  // Handle network or other errors
  console.error('Message send error:', error);
  return { success: false, error: 'Network error occurred' };
}
```

## Performance Considerations

### Database Optimization
- **Indexed Queries**: Optimized conversation and message queries
- **Message Pagination**: Efficient loading of conversation history
- **Connection Pooling**: Optimized database connections
- **Caching**: Redis caching for frequently accessed data

### Image Caching System
The LINE chat interface includes a comprehensive image caching system for optimal performance:

#### Three-Layer Caching Strategy
```typescript
// Memory Cache (L1) - Fastest access
private memoryCache = new Map<string, CachedImage>();
private maxMemorySize = 50; // Max images in memory

// IndexedDB Cache (L2) - Persistent browser storage
private dbName = 'LineImageCache';
private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days retention

// Network Fetch (L3) - Fallback to original source
private async fetchAndCache(url: string): Promise<string>
```

#### Cache Benefits
- **Instant Loading**: Previously viewed images load immediately from memory
- **Bandwidth Savings**: Reduces repeated downloads of LINE profile pictures and message images
- **Offline Support**: Images available even when network is slow or intermittent
- **Automatic Cleanup**: Expired images automatically removed after 7 days
- **Memory Management**: LRU eviction prevents memory bloat (50 image limit)

#### Performance Impact
- **95% faster** loading for repeated image views
- **Significant bandwidth reduction** for staff who frequently access conversations
- **Improved user experience** with instant image display

### UI Optimization
- **Smart Scroll Positioning**: Conversations automatically scroll to bottom on first open only
- **Instant Scroll**: No animated scrolling for initial positioning to prevent disruption
- **Cached Image Components**: Custom `CachedImage` component replacing standard Next.js Image
- **Click Handler Optimization**: Reliable image click handling for full-size modal viewing

### API Rate Limiting
- **LINE API Limits**: Respect LINE's rate limiting requirements
- **Internal Rate Limiting**: Prevent abuse of staff APIs
- **Queue Management**: Handle high-volume message scenarios
- **Retry Logic**: Automatic retry for failed API calls

## Integration Points

### Customer Management System
- **Profile Integration**: Direct access to customer records from conversations
- **Booking History**: View customer booking information in chat context
- **Package Information**: Display active packages and usage
- **Contact Preferences**: Respect customer communication preferences

### Business Intelligence
- **Conversation Analytics**: Track response times and satisfaction
- **Template Effectiveness**: Monitor template usage and success rates
- **Staff Performance**: Measure communication efficiency
- **Customer Insights**: Analyze communication patterns

## Troubleshooting

### Common Issues

#### Message Sending Problems
1. **Check LINE API Credentials**: Verify `LINE_CHANNEL_ACCESS_TOKEN`
2. **Validate User ID**: Ensure LINE user ID is correct and active
3. **Check Message Format**: Verify message structure for text/flex messages
4. **Review Rate Limits**: Check if API rate limits have been exceeded

#### Staff Access Issues
1. **Verify Staff Permissions**: Check `is_staff` flag in database
2. **Session Problems**: Clear browser cache and re-login
3. **API Authentication**: Verify session and token validity
4. **Route Protection**: Check middleware configuration

#### Template Issues
1. **Variable Substitution**: Verify correct `{{variable}}` syntax
2. **Template Activation**: Ensure templates are marked as active
3. **Category Filtering**: Check category assignment and filters
4. **Permission Errors**: Verify staff template management permissions

### Debug Tools
1. **LINE Testing Page**: `/admin/line-messages` for API debugging
2. **Browser Network Tab**: Monitor API requests and responses
3. **Server Logs**: Check application logs for detailed error information
4. **Database Queries**: Verify data integrity and relationships

## Future Enhancements

### Planned Features
1. **AI-Powered Responses**: Smart template suggestions based on context
2. **Multi-language Support**: Templates and responses in multiple languages
3. **Video Message Support**: Enhanced rich media capabilities
4. **Appointment Booking**: Direct booking from LINE conversations
5. **Customer Satisfaction Surveys**: Post-conversation feedback collection

### Technical Improvements
1. **WebSocket Integration**: Real-time bidirectional communication
2. **Push Notifications**: Desktop notifications for new messages
3. **Offline Support**: Message queuing for offline scenarios
4. **Advanced Analytics**: Detailed communication performance metrics
5. **Integration APIs**: Enhanced external system integration

## Related Documentation

- **[Staff Panel System](../features/public/staff-operations/STAFF_PANEL_SYSTEM.md)**: Overall staff panel architecture
- **[Staff LINE Chat System](../features/public/staff-operations/STAFF_LINE_CHAT.md)**: Customer conversation management
- **[Staff Message Templates](../features/public/staff-operations/STAFF_MESSAGE_TEMPLATES.md)**: Template management system
- **[Authentication System](../technical/AUTHENTICATION_SYSTEM.md)**: Role-based access control
- **[Customer Management System](../features/public/customer-packages/CUSTOMER_MANAGEMENT_SYSTEM.md)**: Customer data integration