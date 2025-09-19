# Staff Message Templates System

The Staff Message Templates system provides a comprehensive interface for creating, managing, and using standardized reply messages for customer communication. This system enables consistent, professional communication while reducing response time and improving customer service quality.

## Overview

The Message Templates system allows staff to create and manage reusable message templates organized by categories. These templates support variable substitution and can be quickly inserted into conversations, ensuring consistent and efficient customer communication.

## Access & Permissions

### Requirements
- **Staff Access**: `is_staff = true` in `backoffice.allowed_users`
- **Route**: `/staff/line-templates`
- **API Protection**: Template management requires staff-level access

### Permission Model
- **Template Creation**: Staff and Admin can create templates
- **Template Management**: Staff and Admin can edit/delete templates
- **Template Usage**: All staff can use active templates in conversations

## Core Features

### 1. Template Management

#### Template Creation
- **Rich Editor**: Text input with formatting support
- **Category Assignment**: Organize templates by purpose
- **Message Type Selection**: Choose between text and rich (Flex) messages
- **Variable Support**: Include dynamic customer information
- **Display Order**: Control template ordering within categories

#### Template Properties
```typescript
interface Template {
  id: string;
  title: string;
  content: string;
  category: 'greeting' | 'booking' | 'info' | 'support' | 'general';
  message_type: 'text' | 'flex';
  display_order: number;
  is_active: boolean;
  variables?: Record<string, any>;
  default_image_id?: string;
  created_at: string;
  updated_at: string;
}
```

### 2. Category System

#### Available Categories
1. **Greeting**: Welcome messages and initial customer contact
   - Welcome messages for new customers
   - Business hours information
   - Initial contact responses

2. **Booking**: Booking-related communications
   - Booking confirmations
   - Appointment reminders
   - Cancellation notifications
   - Reschedule assistance

3. **Info**: General information and FAQ responses
   - Facility information
   - Service descriptions
   - Pricing inquiries
   - Location and directions

4. **Support**: Customer service and problem resolution
   - Technical support responses
   - Complaint handling
   - Refund procedures
   - Problem resolution steps

5. **General**: Miscellaneous standard responses
   - Thank you messages
   - Follow-up communications
   - General inquiries
   - Closing statements

#### Category Icons and Colors
```typescript
const categoryIcons = {
  greeting: Users,
  booking: Calendar,
  info: Info,
  support: HelpCircle,
  general: MessageSquare
};

const categoryColors = {
  greeting: 'bg-green-100 text-green-800',
  booking: 'bg-blue-100 text-blue-800',
  info: 'bg-purple-100 text-purple-800',
  support: 'bg-orange-100 text-orange-800',
  general: 'bg-gray-100 text-gray-800'
};
```

### 3. Variable Substitution

#### Supported Variables
- **`{{customer_name}}`**: Automatically replaced with customer's name
- **Future Variables**: Expandable system for additional dynamic content

#### Variable Processing
```typescript
// Example variable substitution
const processTemplate = (content: string, customerName: string) => {
  return content.replace(/\{\{customer_name\}\}/g, customerName);
};

// Usage in templates
"Hello {{customer_name}}, thank you for your booking!"
// Becomes: "Hello John Doe, thank you for your booking!"
```

### 4. Template Editor Interface

#### Creation Form
- **Title Field**: Descriptive template name
- **Category Selector**: Dropdown with all available categories
- **Message Type**: Radio buttons for text/rich message selection
- **Content Editor**: Large text area with preview capability
- **Display Order**: Numeric input for sorting
- **Variable Helper**: Instructions for using variables

#### Editing Features
- **Live Preview**: See how templates will appear to customers
- **Variable Preview**: Real-time variable substitution preview
- **Character Count**: Monitor message length
- **Format Validation**: Ensure proper template structure

## Technical Implementation

### API Endpoints

#### Template Management
```typescript
// Get all templates
GET /api/line/templates?category=greeting&active=true
Response: {
  success: boolean;
  templates: Template[];
  templatesByCategory: Record<string, Template[]>;
}

// Create new template
POST /api/line/templates
Body: {
  title: string;
  content: string;
  category: string;
  message_type: 'text' | 'flex';
  display_order: number;
}

// Update template
PUT /api/line/templates/[id]
Body: {
  title?: string;
  content?: string;
  category?: string;
  is_active?: boolean;
  display_order?: number;
}

// Delete template (soft delete)
DELETE /api/line/templates/[id]
Response: {
  success: boolean;
  message: 'Template deactivated successfully';
}
```

#### Template Usage
```typescript
// Send template message
POST /api/line/templates/[id]/send
Body: {
  userId: string;
  variables?: Record<string, string>;
}
```

### Database Schema

#### Table Structure
```sql
CREATE TABLE line_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  message_type VARCHAR(20) DEFAULT 'text',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '{}',
  default_image_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_templates_category ON line_message_templates(category);
CREATE INDEX idx_templates_active ON line_message_templates(is_active);
CREATE INDEX idx_templates_order ON line_message_templates(display_order);
```

#### Row Level Security
```sql
-- Staff and admin can manage templates
CREATE POLICY "Staff can manage templates" ON line_message_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM backoffice.allowed_users
      WHERE email = auth.jwt() ->> 'email'
      AND (is_staff = true OR is_admin = true)
    )
  );
```

## User Interface

### Template Management Page

#### Layout Structure
```
┌─────────────────────────────────────────────┐
│ LINE Message Templates          [+ New]     │
├─────────────────────────────────────────────┤
│ 🔍 Search... [All][Greeting][Booking]...   │
├─────────────────────────────────────────────┤
│ ┌─ Template Card ─────────────────────────┐ │
│ │ Greeting Template      [Active] [Edit]  │ │
│ │ ─────────────────────                   │ │
│ │ Hello {{customer_name}}, welcome to...  │ │
│ │ Order: 1  Updated: 2025-01-19          │ │
│ └─────────────────────────────────────────┘ │
│ ┌─ Template Card ─────────────────────────┐ │
│ │ Booking Confirmation   [Active] [Edit]  │ │
│ │ ─────────────────────                   │ │
│ │ Your booking is confirmed for...        │ │
│ │ Order: 2  Updated: 2025-01-18          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Template Cards
Each template card displays:
- **Title**: Template name with category badge
- **Content Preview**: First 150 characters of template content
- **Status Indicators**: Active/inactive status
- **Action Buttons**: Edit, activate/deactivate, delete
- **Metadata**: Display order and last updated date

### Template Editor

#### Creation/Edit Form
```
┌─ Create/Edit Template ─────────────────────┐
│ Title: [Welcome Message              ]     │
│ Category: [Greeting ▼]  Type: ● Text ○ Rich│
│ Order: [1  ]                              │
│ ─────────────────────────────────────────  │
│ Content:                                   │
│ ┌─────────────────────────────────────────┐│
│ │ Hello {{customer_name}}, welcome to    ││
│ │ LENGOLF! We're excited to have you     ││
│ │ visit our facility. If you have any    ││
│ │ questions, please don't hesitate to    ││
│ │ ask our staff.                          ││
│ └─────────────────────────────────────────┘│
│ Use {{customer_name}} for dynamic names    │
│ ─────────────────────────────────────────  │
│ [Save] [Cancel]                            │
└────────────────────────────────────────────┘
```

### Template Selector (Chat Integration)

#### Selector Interface
```
┌─ Select Template ──────────────────────────┐
│ 🔍 Search templates...           [×]       │
│ [All][Greeting][Booking][Info][Support]    │
│ ─────────────────────────────────────────  │
│ ┌─ Welcome Message ─────────────────────┐  │
│ │ Greeting • Text Message             │  │
│ │ Hello {{customer_name}}, welcome... │  │
│ └─────────────────────────────────────────┘  │
│ ┌─ Booking Confirmation ────────────────┐  │
│ │ Booking • Text Message              │  │
│ │ Your booking is confirmed for...    │  │
│ └─────────────────────────────────────────┘  │
│ ─────────────────────────────────────────  │
│ Templates with {customer_name} will be     │
│ replaced with: John Doe                    │
└────────────────────────────────────────────┘
```

## Template Best Practices

### Content Guidelines
1. **Clear and Concise**: Keep messages focused and easy to understand
2. **Professional Tone**: Maintain consistent brand voice
3. **Customer-Friendly**: Use welcoming and helpful language
4. **Action-Oriented**: Include clear next steps when appropriate
5. **Variable Usage**: Use variables appropriately for personalization

### Template Organization
1. **Logical Categories**: Group related templates together
2. **Descriptive Titles**: Use clear, searchable template names
3. **Consistent Ordering**: Arrange templates by frequency of use
4. **Regular Reviews**: Update templates based on usage and feedback
5. **Version Control**: Track template changes and effectiveness

### Content Examples

#### Greeting Templates
```
Title: Welcome Message
Category: Greeting
Content: Hello {{customer_name}}, welcome to LENGOLF! We're excited to have you visit our indoor golf facility. Our staff is here to help make your experience amazing. Enjoy your time with us!

Title: Business Hours
Category: Greeting
Content: Hi {{customer_name}}! Our facility is open Monday-Friday 10am-10pm, Saturday-Sunday 9am-11pm. We look forward to seeing you soon!
```

#### Booking Templates
```
Title: Booking Confirmation
Category: Booking
Content: Hi {{customer_name}}, your booking is confirmed! We'll see you soon. If you need to make any changes, please let us know at least 2 hours in advance.

Title: Cancellation Policy
Category: Booking
Content: Hello {{customer_name}}, we understand plans can change. Please note our cancellation policy requires 2 hours notice for booking changes. Thank you for understanding!
```

## Integration with LINE Chat

### Template Usage Flow
1. **Access**: Click template button (📋) in chat interface
2. **Browse**: Select category or search for specific templates
3. **Preview**: See template with customer name substitution
4. **Select**: Click template to populate message input
5. **Customize**: Edit template content if needed
6. **Send**: Send personalized message to customer

### Real-time Features
- **Live Preview**: Templates show actual customer names
- **Instant Search**: Find templates as you type
- **Category Filtering**: Quick access to relevant templates
- **Recent Templates**: Show frequently used templates first

## Analytics and Reporting

### Usage Metrics (Future Enhancement)
- **Template Usage Frequency**: Track most popular templates
- **Category Performance**: Analyze category effectiveness
- **Response Time Improvement**: Measure efficiency gains
- **Customer Satisfaction**: Correlate template usage with satisfaction

### Performance Tracking
- **Search Performance**: Monitor template search speed
- **Load Times**: Track template selector performance
- **Error Rates**: Monitor template creation/update failures
- **User Adoption**: Track staff template usage patterns

## Security and Compliance

### Data Protection
- **Content Validation**: Ensure appropriate template content
- **Access Control**: Restrict template management to authorized staff
- **Audit Trails**: Log all template creation and modification
- **Version History**: Track template changes over time

### Content Moderation
- **Review Process**: Optional approval workflow for new templates
- **Content Guidelines**: Enforce brand and legal compliance
- **Regular Audits**: Review templates for accuracy and relevance
- **Compliance Checks**: Ensure regulatory compliance

## Troubleshooting

### Common Issues
1. **Templates Not Saving**: Check staff permissions and required fields
2. **Variables Not Substituting**: Verify correct variable syntax
3. **Templates Not Appearing**: Check active status and category filters
4. **Search Not Working**: Clear cache and refresh page

### Error Messages
- **"Title and content are required"**: Ensure all required fields are filled
- **"Staff access required"**: User lacks proper permissions
- **"Template not found"**: Template may have been deleted or deactivated
- **"Invalid category"**: Category must be one of the predefined options

## Future Enhancements

### Planned Features
1. **Rich Message Templates**: Enhanced Flex Message support
2. **Template Approval Workflow**: Multi-step approval process
3. **A/B Testing**: Compare template effectiveness
4. **Multi-language Support**: Templates in multiple languages
5. **AI Suggestions**: Smart template recommendations

### Technical Improvements
1. **Version Control**: Full template versioning system
2. **Collaborative Editing**: Multi-user template editing
3. **Import/Export**: Bulk template management
4. **API Expansion**: Enhanced template management APIs
5. **Advanced Analytics**: Detailed usage and performance metrics

## Related Documentation

- **[Staff Panel System](./STAFF_PANEL_SYSTEM.md)**: Overall staff panel architecture
- **[Staff LINE Chat System](./STAFF_LINE_CHAT.md)**: Chat interface integration
- **[LINE Messaging Integration](../../../integrations/LINE_MESSAGING_INTEGRATION.md)**: Technical LINE API integration
- **[Authentication System](../../../technical/AUTHENTICATION_SYSTEM.md)**: Staff access control