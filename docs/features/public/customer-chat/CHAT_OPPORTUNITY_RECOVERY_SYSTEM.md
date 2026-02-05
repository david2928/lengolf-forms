# Chat Opportunity Recovery System

**AI-powered sales opportunity detection and management for chat conversations**
*Implementation Date: February 2025*

## Table of Contents
1. [Overview](#overview)
2. [Business Context](#business-context)
3. [System Architecture](#system-architecture)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [LLM Integration](#llm-integration)
9. [Configuration](#configuration)
10. [Usage Guide](#usage-guide)
11. [Technical Implementation](#technical-implementation)
12. [Performance Considerations](#performance-considerations)
13. [Best Practices](#best-practices)

## Overview

The Chat Opportunity Recovery System is a sales recovery tool that identifies and manages potential customers from chat conversations that have gone "cold" (no response for several days). Similar to the OB Sales system that targets inactive customers for phone follow-up, this system targets chat conversations with unrealized sales potential.

### Primary Functions
- **Opportunity Detection**: Scan conversations for cold leads with sales potential
- **LLM-Powered Analysis**: Use GPT-4o-mini to classify opportunities and generate personalized follow-up messages
- **Priority Queue**: Organize opportunities by priority for efficient staff follow-up
- **Outcome Tracking**: Track conversion rates and follow-up effectiveness
- **Sidebar Integration**: Quick access to opportunity details from the chat interface

### Key Distinction: Following vs. Opportunities

| Feature | Following (Existing) | Opportunities (NEW) |
|---------|---------------------|---------------------|
| **Purpose** | Short-term operational follow-up | Sales recovery of cold leads |
| **Example** | "Waiting for customer to confirm booking time" | "Asked about lessons 7 days ago, never responded" |
| **Duration** | Hours to few days | Days to weeks |
| **Action** | Quick response when customer replies | Proactive outreach to re-engage |
| **Similar to** | Email "flagged for follow-up" | OB Sales calling queue |

## Business Context

### Problem Statement
Analysis of chat data revealed significant untapped potential:
- **613 total conversations** across all channels
- **0 flagged for follow-up** despite the feature existing
- High "lost" rates for valuable inquiry types:

| Inquiry Type | Total | Not Converted | Lost Rate |
|-------------|-------|---------------|-----------|
| Coaching | 47 | 24 | **51%** |
| Pricing | 33 | 17 | **52%** |
| Equipment | 20 | 11 | **55%** |
| Packages | 42 | 17 | 40% |
| Booking | 109 | 29 | 27% |

### Real Examples of Lost Opportunities
1. **"Pao"** - Asked about Starter Package for golf lessons, received detailed info about coaches and equipment, never responded (7 days cold)
2. **"KOoK"** - Highly interested, provided full contact info, wanted to book but slot was full, said "will come another day" - never did (9 days cold)

## System Architecture

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│                        Unified Chat Interface                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CONVERSATIONS (Normal Chat)                                │   │
│  │  ├── All Chats                                              │   │
│  │  ├── Following (short-term operational)                     │   │
│  │  └── Spam                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  SALES OPPORTUNITIES (Separate Tab/Section)                 │   │
│  │  ├── Cold leads from chat                                   │   │
│  │  ├── LLM-powered analysis & suggestions                     │   │
│  │  └── Outcome tracking (like OB Sales)                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │  LLM Analysis Engine (async)  │
                         │  - Classifies opportunity type│
                         │  - Suggests follow-up action  │
                         │  - Drafts personalized message│
                         └───────────────────────────────┘
```

### Component Architecture
```
app/
├── api/chat-opportunities/
│   ├── route.ts              # List & create opportunities
│   ├── [id]/route.ts         # CRUD for single opportunity
│   ├── analyze/route.ts      # LLM analysis endpoint
│   ├── scan/route.ts         # Find potential opportunities
│   └── stats/route.ts        # Statistics endpoint
├── staff/unified-chat/
│   └── page.tsx              # Main chat interface with Opportunities tab
└── staff/line-chat/
    └── components/
        └── CustomerSidebar.tsx  # Opportunity card integration

src/
├── components/chat-opportunities/
│   ├── index.ts
│   ├── OpportunitiesTab.tsx     # Main opportunities view
│   ├── OpportunityCard.tsx      # Individual opportunity card
│   ├── OpportunityDetail.tsx    # Full detail panel
│   ├── OpportunityFilters.tsx   # Status/priority filters
│   └── ChatPreviewPanel.tsx     # Conversation preview
├── hooks/
│   └── useChatOpportunities.ts  # Data fetching hook
└── types/
    └── chat-opportunities.ts    # TypeScript definitions
```

## Key Features

### 1. Opportunity Detection
- **Automated Scanning**: Database function identifies cold conversations
- **Keyword Detection**: Recognizes inquiry-related keywords in Thai/English
- **Smart Filtering**: Excludes spam, conversations already linked to customers
- **Configurable Thresholds**: Adjustable "cold" period (default: 3 days)

### 2. LLM-Powered Analysis
- **Opportunity Classification**: coaching_inquiry, pricing_inquiry, booking_failed, package_interest, equipment_inquiry, general_interest
- **Priority Assignment**: High, Medium, Low based on customer intent and engagement
- **Confidence Scoring**: 0-100% confidence in opportunity classification
- **Personalized Messages**: Draft follow-up in customer's language (Thai/English)

### 3. Staff Workflow
- **Priority Queue**: Opportunities sorted by priority and age
- **Quick Actions**: One-click to open chat, copy suggested message
- **Outcome Tracking**: Mark as Contacted, Converted, Lost, or Dismissed
- **Notes System**: Add notes about follow-up attempts

### 4. Sidebar Integration
- **Contextual Display**: See opportunity details when viewing related chat
- **Quick Navigation**: Link from Customer Info sidebar to opportunity detail
- **Status Indicators**: Visual badges showing opportunity status and priority

## Database Schema

### Main Table: `chat_opportunities`
```sql
CREATE TABLE public.chat_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  channel_type TEXT NOT NULL,

  -- Classification
  opportunity_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  confidence_score DECIMAL(3,2),

  -- LLM Analysis
  analysis_summary TEXT,
  suggested_action TEXT,
  suggested_message TEXT,

  -- Contact info (extracted)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending',
  contacted_at TIMESTAMPTZ,
  contacted_by TEXT,
  outcome TEXT,
  outcome_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  UNIQUE(conversation_id)
);
```

### Audit Log Table: `chat_opportunity_logs`
```sql
CREATE TABLE public.chat_opportunity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES chat_opportunities(id),
  action TEXT NOT NULL,
  actor TEXT,
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Database Functions

#### `find_chat_opportunities()`
Identifies potential opportunities from cold conversations:
```sql
-- Parameters:
-- p_days_threshold: Days since last message (default: 3)
-- p_max_age_days: Maximum conversation age (default: 30)

-- Filters:
-- - Not spam
-- - Not following
-- - Not already an opportunity
-- - No linked customer (excludes converted customers)
-- - Has inquiry keywords (optional boost)
```

#### `get_chat_opportunities()`
Retrieves opportunities with conversation details:
```sql
-- Returns: Opportunities joined with conversation data
-- Includes: last_message_at, last_message_text, channel_metadata, days_cold
-- Filters: status, priority, opportunity_type, channel_type
-- Pagination: offset, limit
```

### Opportunity Types
```typescript
type OpportunityType =
  | 'coaching_inquiry'    // Lessons, coaches, learning golf
  | 'pricing_inquiry'     // Prices, promotions, discounts
  | 'booking_failed'      // Wanted to book but couldn't
  | 'package_interest'    // Packages, memberships
  | 'equipment_inquiry'   // Equipment, clubs, accessories
  | 'general_interest';   // General interest
```

### Status Flow
```
pending → contacted → converted
                   ↘ lost
pending → dismissed → pending (restore)
```

**Restore Functionality**: Dismissed opportunities can be restored to "Pending" status from the detail view using the "Restore to Pending" button. This is useful when an opportunity was incorrectly dismissed.

## API Endpoints

### List Opportunities
```typescript
GET /api/chat-opportunities

// Query Parameters:
// status: pending | contacted | converted | lost | dismissed
// priority: high | medium | low
// opportunityType: coaching_inquiry | pricing_inquiry | ...
// channelType: line | website | facebook | instagram | whatsapp
// conversationId: UUID (direct lookup)
// offset: number (pagination)
// limit: number (pagination)

// Response:
{
  success: true,
  opportunities: ChatOpportunityWithConversation[],
  total: number
}
```

### Create Opportunity
```typescript
POST /api/chat-opportunities

// Request Body:
{
  conversation_id: string,
  channel_type: ChannelType,
  opportunity_type: OpportunityType,
  priority?: OpportunityPriority,
  confidence_score?: number,
  analysis_summary?: string,
  suggested_action?: string,
  suggested_message?: string,
  customer_name?: string,
  customer_phone?: string,
  customer_email?: string
}

// Response:
{
  success: true,
  opportunity: ChatOpportunity
}
```

### Update Opportunity
```typescript
PATCH /api/chat-opportunities/[id]

// Request Body:
{
  status?: OpportunityStatus,
  priority?: OpportunityPriority,
  outcome?: string,
  outcome_notes?: string,
  contacted_by?: string
}

// Response:
{
  success: true,
  opportunity: ChatOpportunity
}
```

### Analyze Conversation
```typescript
POST /api/chat-opportunities/analyze

// Request Body:
{
  conversationId: string,
  messages: ConversationMessage[]
}

// Response:
{
  success: true,
  isOpportunity: boolean,
  analysis: {
    opportunityType: OpportunityType | 'not_an_opportunity',
    priority: OpportunityPriority,
    confidenceScore: number,
    analysisSummary: string,
    suggestedAction: string,
    suggestedMessage: string,
    extractedContactInfo?: {
      name?: string,
      phone?: string,
      email?: string
    }
  }
}
```

### Scan for Opportunities
```typescript
POST /api/chat-opportunities/scan

// Request Body:
{
  daysThreshold?: number,   // Days since last message (default: 3)
  maxAgeDays?: number       // Max conversation age (default: 30)
}

// Response:
{
  success: true,
  potentials: PotentialOpportunity[],
  total: number
}
```

### Get Statistics
```typescript
GET /api/chat-opportunities/stats

// Response:
{
  success: true,
  stats: {
    total_pending: number,
    total_contacted: number,
    total_converted: number,
    total_lost: number,
    total_dismissed: number,
    conversion_rate: number,
    avg_days_to_contact: number,
    by_type: Record<OpportunityType, number>,
    by_priority: Record<OpportunityPriority, number>,
    by_channel: Record<ChannelType, number>
  }
}
```

## UI Components

### OpportunitiesTab
Main view for managing opportunities with three sections:
1. **Scan View**: Find and analyze new potential opportunities
2. **List View**: Browse existing opportunities with filters
3. **Detail View**: Full opportunity details with outcome tracking

```typescript
interface OpportunitiesTabProps {
  onOpenConversation: (conversationId: string) => void;
}
```

### OpportunityCard
Compact card displaying key opportunity info:
- Customer name and channel icon
- Priority badge (color-coded)
- Opportunity type label
- Days cold indicator
- Quick action buttons

```typescript
interface OpportunityCardProps {
  opportunity: ChatOpportunityWithConversation;
  isSelected?: boolean;
  onSelect?: (opportunity: ChatOpportunityWithConversation) => void;
  onOpenChat?: (opportunity: ChatOpportunityWithConversation) => void;
  compact?: boolean;
}
```

### OpportunityDetail
Full detail view with:
- Status and metadata cards
- AI analysis summary
- Suggested follow-up message (copyable)
- Last message preview
- Outcome tracking form
- **Restore button** for dismissed opportunities (returns to Pending status)

```typescript
interface OpportunityDetailProps {
  opportunity: ChatOpportunityWithConversation;
  onClose: () => void;
  onOpenChat: (opportunity: ChatOpportunityWithConversation) => void;
  onUpdateStatus: (
    opportunity: ChatOpportunityWithConversation,
    status: OpportunityStatus,
    outcome?: string,
    notes?: string
  ) => Promise<void>;
  onCopySuggestedMessage?: (message: string) => void;
  loading?: boolean;
}
```

### OpportunityFilters
Filter controls with:
- Status tabs (All, Pending, Contacted, Converted, Dismissed)
- Combined dropdown for Priority, Type, Channel filters
- Mobile-optimized horizontal scrolling
- Dismissed tab shows count badge for easy visibility

### CustomerSidebar Integration
Sales Opportunity card shown when viewing a chat with an associated opportunity:
- Amber-colored card with TrendingUp icon
- Priority badge
- AI analysis summary (truncated)
- "View Opportunity" button linking to detail view

## LLM Integration

### Model Configuration
- **Model**: GPT-4o-mini (cost-effective, fast)
- **Temperature**: 0.3 (consistent, focused analysis)
- **Max Tokens**: 800 (sufficient for analysis + message)

### System Prompt
The LLM is configured with:
- Business context (Lengolf services, pricing, hours)
- Opportunity type definitions
- Priority criteria
- Output format requirements

### Language Detection
- Automatically detects Thai/English from customer messages
- Generates follow-up message in detected language

### Thai Language Requirements (Critical)
All Thai messages are written as a **female staff member**:
- **ALWAYS** use feminine particles: "ค่ะ" or "ค่า" at end of sentences
- **NEVER** use masculine particle "ครับ"
- Sound warm, friendly, and professional like a Thai woman
- Keep messages concise but polite

**Thai Message Examples:**
```
สวัสดีค่ะ ไม่ทราบว่ายังสนใจเรียนกอล์ฟอยู่มั้ยคะ? ตอนนี้มีโปรโค้ชว่างหลายท่านเลยค่ะ 🏌️‍♀️
สวัสดีค่ะ ครั้งก่อนคิวเต็มต้องขออภัยด้วยนะคะ 🙏 ไม่ทราบว่าสะดวกวันไหนคะ?
สวัสดีค่ะ ตอนนี้ทางร้านมีโปรโมชั่นพิเศษค่ะ ถ้าสนใจบอกแอดมินได้เลยนะคะ 🎯
```

### English Message Style
- Warm, friendly, and professional tone
- Concise but helpful
- Soft call-to-action included
- Appropriate emoji usage (⛳ 🏌️ 😊)

### Excluded Conversation Types (Not Opportunities)
The following types are automatically classified as `not_an_opportunity` by the LLM:

1. **B2B Partnership/Collaboration Requests**
   - Business partnership inquiries (ร่วมมือ, partnership, collaboration)
   - Joint promotion proposals
   - Vendor/supplier inquiries
   - Influencer/content creator collaboration requests
   - Businesses offering services TO Lengolf

2. **Job Seekers**
   - Employment inquiries (สมัครงาน, hiring, job)
   - Coach position applicants

3. **Spam/Irrelevant**
   - Promotional spam from other businesses
   - Automated messages
   - Scams or phishing attempts

4. **Customer Service Issues**
   - Complaints about past service
   - Refund requests
   - Technical issues (not sales-related)

**Thai Keywords for Exclusion:**
- ร่วมมือ, ความร่วมมือ (collaboration)
- พาร์ทเนอร์ (partner)
- ร่วมโปรโมท (joint promotion)
- สมัครงาน, หางาน (job seeking)
- ขายสินค้า, เสนอขาย (selling to us)

### Analysis Output
```typescript
interface OpportunityAnalysis {
  opportunityType: OpportunityType | 'not_an_opportunity';
  priority: OpportunityPriority;
  confidenceScore: number;      // 0.0 to 1.0
  analysisSummary: string;      // 1-2 sentences
  suggestedAction: string;      // What staff should do
  suggestedMessage: string;     // Draft follow-up message
  extractedContactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}
```

## Configuration

### Environment Variables
```env
# Required for LLM analysis
OPENAI_API_KEY=sk-your-openai-api-key
AI_SUGGESTION_ENABLED=true

# Model settings (optional)
OPENAI_MODEL=gpt-4o-mini
```

### Scan Configuration
```typescript
// Default scan parameters
const DEFAULT_DAYS_THRESHOLD = 3;   // Days since last message
const DEFAULT_MAX_AGE_DAYS = 30;    // Max conversation age
const CONFIDENCE_THRESHOLD = 0.6;   // Min confidence to create opportunity
```

## Usage Guide

### For Staff Users

#### Accessing Opportunities
1. Navigate to Unified Chat (`/staff/unified-chat`)
2. Click "Opportunities" section below the conversation list
3. View pending opportunities sorted by priority

#### Scanning for New Opportunities
1. Click "Scan for Opportunities" button
2. Review potential opportunities (shows name, days cold, preview)
3. Click "Analyze" on promising conversations
4. LLM analyzes and creates opportunity record if qualified

#### Working Opportunities
1. Select an opportunity from the list
2. Review AI analysis and suggested message
3. Click "Open Chat" to view full conversation
4. Copy suggested message or compose your own
5. Send message to customer
6. Return and update outcome:
   - **Mark Contacted**: Customer was reached
   - **Converted**: Customer booked/purchased
   - **Lost**: Customer declined or no response

#### From Chat View
1. When viewing a conversation with an opportunity
2. See "Sales Opportunity" card in Customer Info sidebar
3. Click "View Opportunity" to see full details

### For Administrators

#### Monitoring Performance
- Track conversion rates by opportunity type
- Monitor average days-to-contact
- Review opportunity distribution by channel

#### Adjusting Thresholds
- Modify scan parameters for detection sensitivity
- Adjust confidence threshold for quality control

## Technical Implementation

### Hook: useChatOpportunities
```typescript
export function useChatOpportunities() {
  // State
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  // Actions
  const fetchOpportunities = useCallback(async () => {...}, [filters]);
  const scanForOpportunities = useCallback(async () => {...}, []);
  const analyzeConversation = useCallback(async (id, messages) => {...}, []);
  const updateOpportunityStatus = useCallback(async (id, updates) => {...}, []);

  return {
    opportunities,
    loading,
    filters,
    setFilters,
    fetchOpportunities,
    scanForOpportunities,
    analyzeConversation,
    updateOpportunityStatus,
    // ... more
  };
}
```

### Message API Compatibility
The messages API (`/api/conversations/unified/[id]/messages`) returns snake_case field names to ensure compatibility with the analyze endpoint:
```typescript
// Transformed message format
{
  id: string,
  content: string,           // Not 'text'
  content_type: string,
  sender_type: 'user' | 'admin',
  sender_name: string,
  created_at: string
}
```

### Mobile Optimization
- Horizontal scrollable status tabs with hidden scrollbar
- Compact card layout for small screens
- Touch-friendly action buttons (44px min height)
- Responsive detail panel with back navigation

## Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_chat_opportunities_status ON chat_opportunities(status);
CREATE INDEX idx_chat_opportunities_priority ON chat_opportunities(priority);
CREATE INDEX idx_chat_opportunities_type ON chat_opportunities(opportunity_type);
CREATE INDEX idx_chat_opportunities_conversation ON chat_opportunities(conversation_id);
```

### API Optimization
- Paginated opportunity list (default 20 per page)
- Conversation details joined in single query
- Direct lookup by conversation_id for sidebar

### LLM Cost Control
- Only analyze when manually triggered (not automatic)
- Confidence threshold filters low-quality detections
- Batch analysis with rate limiting

## Best Practices

### Opportunity Detection
1. **Quality over Quantity**: Better to have fewer, higher-quality opportunities
2. **Regular Scanning**: Scan weekly to catch fresh opportunities
3. **Exclude Converted**: Already-linked customers excluded automatically

### Follow-Up Messaging
1. **Personalize**: Review and customize suggested messages
2. **Match Language**: Ensure response matches customer's language
3. **Timely Response**: Contact within 24-48 hours of detection
4. **Add Value**: Include relevant offers or new information

### Outcome Tracking
1. **Record All Outcomes**: Track even negative results for learning
2. **Add Notes**: Document what worked or didn't
3. **Regular Review**: Analyze patterns to improve targeting

### Data Quality
1. **Review Classifications**: Verify LLM classifications are accurate
2. **Adjust Priorities**: Override auto-priorities when needed
3. **Clean Up Stale**: Dismiss very old opportunities (>60 days)

## Success Metrics

### Target KPIs
- **Contact Rate**: >80% of opportunities contacted within 48 hours
- **Conversion Rate**: >15% of contacted opportunities convert
- **Response Time**: <24 hours average time to first contact
- **Quality Score**: >70% average LLM confidence score

### Tracking Dashboard
Key metrics tracked:
- Total opportunities by status
- Conversion rate by opportunity type
- Average days to contact
- Channel distribution

---

**Last Updated**: February 2025
**Version**: 1.1
**Maintainer**: Lengolf Development Team
**Related Systems**: Unified Chat, OB Sales (Lead Feedback), Customer Management

### Changelog
- **v1.1** (Feb 2025): Added B2B/collaboration exclusion filters, Dismissed tab, Restore functionality
- **v1.0** (Feb 2025): Initial release
