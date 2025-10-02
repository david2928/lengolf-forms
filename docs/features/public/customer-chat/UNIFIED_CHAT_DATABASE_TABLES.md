# Unified Chat System - Database Tables Reference

**Complete Database Schema Documentation for Multi-Channel Chat**
*Last Updated: January 2025*

---

## 📊 Overview

This document provides comprehensive documentation for all database tables used in the Unified Chat System. The system uses **19 tables and 2 views** to support multi-channel messaging across LINE, Website, Facebook, Instagram, and WhatsApp.

---

## 📋 Complete Table Inventory

### Summary by Category

| Category | Tables | Purpose |
|----------|--------|---------|
| **LINE Chat** | 8 tables | LINE messaging system |
| **Website Chat** | 3 tables | Website chat widget |
| **Meta Platforms** | 4 tables | Facebook/Instagram/WhatsApp |
| **AI & Embeddings** | 2 tables | AI suggestions (disabled) |
| **Unified Views** | 2 views | Cross-channel aggregation |
| **TOTAL** | **19 tables + 2 views** | |

---

## 📱 LINE Chat Tables (8 tables)

### 1. `line_users`
**Purpose**: LINE user profiles and customer associations

**Key Fields**:
- `id` (UUID, PK)
- `line_user_id` (VARCHAR, UNIQUE) - LINE's internal user ID
- `display_name` (VARCHAR) - User's display name
- `picture_url` (TEXT) - Profile picture URL
- `customer_id` (UUID, FK → customers.id) - Linked customer record
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_line_users_line_user_id` (UNIQUE)
- `idx_line_users_customer_id`
- `idx_line_users_active`

---

### 2. `line_conversations`
**Purpose**: LINE conversation management

**Key Fields**:
- `id` (UUID, PK)
- `line_user_id` (VARCHAR, FK → line_users.line_user_id)
- `customer_id` (UUID, FK → customers.id)
- `last_message_at` (TIMESTAMPTZ)
- `last_message_text` (TEXT)
- `last_message_by` (VARCHAR) - 'user' or 'admin'
- `last_message_type` (VARCHAR) - 'text', 'image', 'sticker', etc.
- `unread_count` (INTEGER)
- `is_active` (BOOLEAN)
- `assigned_to` (UUID, FK → profiles.id)

**Indexes**:
- `idx_line_conversations_line_user_id`
- `idx_line_conversations_customer_id`
- `idx_line_conversations_last_message_at` (DESC)
- `idx_line_conversations_active`
- `idx_line_conversations_unread` (WHERE unread_count > 0)

---

### 3. `line_messages`
**Purpose**: LINE message storage with rich content support

**Key Fields**:
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → line_conversations.id)
- `line_user_id` (VARCHAR, FK → line_users.line_user_id)
- `line_message_id` (VARCHAR, UNIQUE) - LINE's message ID
- `message_text` (TEXT)
- `message_type` (VARCHAR) - 'text', 'image', 'file', 'sticker', etc.
- `sender_type` (VARCHAR) - 'user' or 'admin'
- `sender_name` (VARCHAR)

**Rich Content Fields**:
- `image_url`, `file_url`, `file_name`, `file_size`, `file_type`
- `package_id`, `sticker_id`, `sticker_keywords` (TEXT[])

**Reply/Quote Fields**:
- `quote_token` (VARCHAR)
- `replied_to_message_id` (UUID, FK → line_messages.id)
- `reply_preview_text`, `reply_preview_type`

**Metadata**:
- `is_read` (BOOLEAN)
- `delivered_at`, `failed_reason`
- `created_at`, `updated_at`

**Indexes**:
- `idx_line_messages_conversation_id`
- `idx_line_messages_line_user_id`
- `idx_line_messages_created_at` (DESC)
- `idx_line_messages_sender_type`
- `idx_line_messages_type`
- `idx_line_messages_unread` (WHERE is_read = false)
- `idx_line_messages_line_message_id` (UNIQUE, WHERE NOT NULL)

---

### 4. `line_message_templates`
**Purpose**: Pre-configured message templates for staff

**Key Fields**:
- `id` (UUID, PK)
- `title` (VARCHAR)
- `category` (VARCHAR) - 'greeting', 'booking', 'info', etc.
- `content` (TEXT) - Template content with variables like {{customer_name}}
- `variables` (TEXT[]) - List of variable names
- `is_active` (BOOLEAN)
- `usage_count` (INTEGER)
- `created_by` (UUID, FK → profiles.id)

**Indexes**:
- `idx_line_message_templates_category`
- `idx_line_message_templates_active`
- `idx_line_message_templates_usage` (DESC)

---

### 5. `line_curated_images`
**Purpose**: Managed image library for staff use

**Key Fields**:
- `id` (UUID, PK)
- `title`, `description` (VARCHAR, TEXT)
- `image_url` (TEXT)
- `category` (VARCHAR)
- `tags` (TEXT[])
- `file_size`, `mime_type`
- `is_active` (BOOLEAN)
- `usage_count` (INTEGER)
- `created_by` (UUID, FK → profiles.id)

**Indexes**:
- `idx_line_curated_images_category`
- `idx_line_curated_images_active`
- `idx_line_curated_images_tags` (GIN)

---

### 6. `line_webhook_logs`
**Purpose**: LINE webhook event logging for debugging

**Key Fields**:
- `id` (UUID, PK)
- `event_type` (VARCHAR)
- `source_type`, `source_user_id`, `message_id`
- `webhook_data` (JSONB) - Full webhook payload
- `processing_status` (VARCHAR) - 'pending', 'processed', 'failed'
- `error_message` (TEXT)
- `processed_at`, `created_at`

**Indexes**:
- `idx_line_webhook_logs_event_type`
- `idx_line_webhook_logs_created_at` (DESC)
- `idx_line_webhook_logs_status`
- `idx_line_webhook_logs_user_id`

---

### 7. `line_group_debug`
**Purpose**: LINE group chat debugging

**Key Fields**:
- `id` (UUID, PK)
- Group-specific debugging data

---

### 8. `line_group_debug_settings`
**Purpose**: Debug configuration for LINE groups

**Key Fields**:
- `id` (UUID, PK)
- Debug settings and configuration

---

## 🌐 Website Chat Tables (3 tables)

### 9. `web_chat_sessions`
**Purpose**: Website user sessions (anonymous + authenticated users)

**Key Fields**:
- `id` (UUID, PK)
- `session_id` (VARCHAR, UNIQUE) - Generated session identifier
- `user_id` (UUID, FK → auth.users.id) - For authenticated users
- `customer_id` (UUID, FK → customers.id) - Linked customer
- `display_name`, `email` (VARCHAR)
- `ip_address` (INET)
- `user_agent` (TEXT)
- `last_seen_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN)

**Indexes**:
- `idx_web_chat_sessions_session_id` (UNIQUE)
- `idx_web_chat_sessions_user_id`
- `idx_web_chat_sessions_customer_id`
- `idx_web_chat_sessions_email`
- `idx_web_chat_sessions_active`
- `idx_web_chat_sessions_last_seen` (DESC)

---

### 10. `web_chat_conversations`
**Purpose**: Website conversation management

**Key Fields**:
- `id` (UUID, PK)
- `session_id` (UUID, FK → web_chat_sessions.id)
- `last_message_at` (TIMESTAMPTZ)
- `last_message_text` (TEXT)
- `unread_count` (INTEGER)
- `is_active` (BOOLEAN)
- `assigned_to` (UUID, FK → profiles.id)

**Indexes**:
- `idx_web_chat_conversations_session_id`
- `idx_web_chat_conversations_last_message_at` (DESC)
- `idx_web_chat_conversations_active`
- `idx_web_chat_conversations_unread` (WHERE unread_count > 0)

---

### 11. `web_chat_messages`
**Purpose**: Website message storage

**Key Fields**:
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → web_chat_conversations.id)
- `session_id` (UUID, FK → web_chat_sessions.id)
- `message_text` (TEXT)
- `sender_type` (VARCHAR) - 'customer' or 'staff'
- `sender_name` (VARCHAR)
- `file_url`, `file_name`, `file_size`, `file_type`
- `is_read` (BOOLEAN)
- `created_at`, `updated_at`

**Indexes**:
- `idx_web_chat_messages_conversation_id`
- `idx_web_chat_messages_session_id`
- `idx_web_chat_messages_created_at` (DESC)
- `idx_web_chat_messages_sender_type`
- `idx_web_chat_messages_unread` (WHERE is_read = false)

---

## 📱 Meta Platform Tables (4 tables)

### 12. `meta_users`
**Purpose**: User profiles from Facebook, Instagram, and WhatsApp

**Key Fields**:
- `id` (UUID, PK)
- `platform_user_id` (VARCHAR) - Platform-specific user ID
- `platform` (VARCHAR) - 'facebook', 'instagram', 'whatsapp'
- `display_name` (VARCHAR)
- `profile_pic` (TEXT)
- `phone_number` (VARCHAR) - For WhatsApp
- `customer_id` (UUID, FK → customers.id)
- `last_seen_at`, `is_active`

---

### 13. `meta_conversations`
**Purpose**: Conversation management across Meta platforms

**Key Fields**:
- `id` (UUID, PK)
- `platform_user_id` (VARCHAR)
- `platform` (VARCHAR)
- `last_message_at`, `last_message_text`
- `unread_count` (INTEGER)
- `is_active` (BOOLEAN)
- `customer_id` (UUID, FK → customers.id)
- `assigned_to` (UUID, FK → profiles.id)

---

### 14. `meta_messages`
**Purpose**: Message storage with platform-specific metadata

**Key Fields**:
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → meta_conversations.id)
- `platform_user_id` (VARCHAR)
- `platform_message_id` (VARCHAR) - Platform's message ID
- `message_text` (TEXT)
- `message_type` (VARCHAR)
- `sender_type` (VARCHAR) - 'user' or 'staff'
- `sender_name` (VARCHAR)
- `platform` (VARCHAR)
- `webhook_event_id` (VARCHAR)
- `attachments` (JSONB)
- `reply_to_message_id` (VARCHAR)
- `is_read` (BOOLEAN)

---

### 15. `meta_webhook_logs`
**Purpose**: Webhook event logging for Meta platforms

**Key Fields**:
- `id` (UUID, PK)
- `event_type` (VARCHAR)
- `platform` (VARCHAR)
- `hub_signature` (VARCHAR) - Webhook signature verification
- `webhook_data` (JSONB)
- `processing_status` (VARCHAR)
- `error_message` (TEXT)
- `created_at`

---

## 🤖 AI & Embeddings Tables (2 tables)

> ⚠️ **Status**: AI features currently disabled, tables preserved for future use

### 16. `message_embeddings`
**Purpose**: Vector embeddings for RAG-based AI suggestions

**Key Fields**:
- `id` (UUID, PK)
- `line_message_id` (UUID, FK → line_messages.id)
- `web_message_id` (UUID, FK → web_chat_messages.id)
- `conversation_id`, `customer_id` (UUID)
- `channel_type` (TEXT) - 'line' or 'website'
- `content` (TEXT) - Original message content
- `content_translated` (TEXT) - Translated version
- `embedding` (VECTOR(1536)) - OpenAI text-embedding-3-small
- `message_category`, `intent_detected`
- `response_used` (TEXT) - Staff's actual response
- `language_detected` (TEXT)

**Purpose**: Enables similarity search for finding relevant past conversations

---

### 17. `ai_suggestions`
**Purpose**: AI suggestion tracking and feedback

**Key Fields**:
- `id` (UUID, PK)
- `conversation_id` (UUID)
- `customer_message` (TEXT)
- `suggested_response` (TEXT)
- `confidence_score` (FLOAT)
- `was_accepted`, `was_edited`, `was_declined` (BOOLEAN)
- `final_response` (TEXT) - What staff actually sent
- `context_used` (JSONB) - Context data used for generation
- `created_at`

**Purpose**: Tracks AI suggestion performance and staff feedback

---

## 🔄 Unified Views (2 views)

### 18. `unified_conversations` (VIEW)
**Purpose**: Combines conversations from all channels (LINE, Website, Meta)

**Structure**:
```sql
SELECT
  'line' AS channel_type,
  lc.id,
  lc.line_user_id AS channel_user_id,
  COALESCE(lc.customer_id, lu.customer_id) AS customer_id,
  lc.last_message_at,
  lc.last_message_text,
  lc.last_message_by,
  lc.unread_count,
  lc.is_active,
  jsonb_build_object(...) AS channel_metadata
FROM line_conversations lc
LEFT JOIN line_users lu ON lc.line_user_id = lu.line_user_id

UNION ALL

SELECT
  'website' AS channel_type,
  wcc.id,
  wcc.session_id::text AS channel_user_id,
  COALESCE(wcs.customer_id, p.customer_id) AS customer_id,
  ...
FROM web_chat_conversations wcc
LEFT JOIN web_chat_sessions wcs ON wcc.session_id = wcs.id

UNION ALL

SELECT
  platform AS channel_type, -- 'facebook', 'instagram', 'whatsapp'
  mc.id,
  mc.platform_user_id AS channel_user_id,
  mc.customer_id,
  ...
FROM meta_conversations mc
LEFT JOIN meta_users mu ON mc.platform_user_id = mu.platform_user_id;
```

**Key Columns**:
- `channel_type` - 'line', 'website', 'facebook', 'instagram', 'whatsapp'
- `id` - Conversation ID
- `channel_user_id` - Platform-specific user identifier
- `customer_id` - Linked customer record
- `channel_metadata` (JSONB) - Platform-specific data (display_name, picture_url, email, etc.)

---

### 19. `unified_messages` (VIEW)
**Purpose**: Combines messages from all channels with standardized format

**Structure**:
```sql
SELECT
  'line' AS channel_type,
  lm.id,
  lm.conversation_id,
  lm.line_user_id AS channel_user_id,
  lm.message_text AS content,
  lm.message_type AS content_type,
  lm.sender_type,
  lm.sender_name,
  lm.is_read,
  lm.created_at,
  jsonb_build_object(...) AS channel_metadata
FROM line_messages lm

UNION ALL

SELECT
  'website' AS channel_type,
  wcm.id,
  wcm.conversation_id,
  wcm.session_id::text AS channel_user_id,
  wcm.message_text AS content,
  CASE WHEN wcm.file_url IS NOT NULL THEN 'file' ELSE 'text' END AS content_type,
  ...
FROM web_chat_messages wcm

UNION ALL

SELECT
  mm.platform AS channel_type,
  mm.id,
  mm.conversation_id,
  mm.platform_user_id AS channel_user_id,
  mm.message_text AS content,
  mm.message_type AS content_type,
  ...
FROM meta_messages mm;
```

**Key Columns**:
- `channel_type` - Source platform
- `content` - Standardized message content
- `content_type` - 'text', 'image', 'file', 'sticker', etc.
- `channel_metadata` (JSONB) - Platform-specific message data

---

## 🔗 Table Relationships

### Customer Linking Hierarchy
```
customers (central hub)
├── line_users.customer_id → customers.id
├── profiles.customer_id → customers.id
├── meta_users.customer_id → customers.id
└── web_chat_sessions.customer_id → customers.id
```

### Conversation Flow by Channel

**LINE**:
```
line_users → line_conversations → line_messages
```

**Website**:
```
profiles → web_chat_sessions → web_chat_conversations → web_chat_messages
```

**Meta Platforms**:
```
meta_users → meta_conversations → meta_messages
```

**Unified**:
```
unified_conversations (VIEW) ← [line_conversations, web_chat_conversations, meta_conversations]
unified_messages (VIEW) ← [line_messages, web_chat_messages, meta_messages]
```

---

## 📊 Database Triggers & Functions

### Auto-Update Triggers
- **`trigger_update_line_conversation_last_message`** - Updates conversation metadata when new LINE message inserted
- **`trigger_update_web_conversation_last_message`** - Updates conversation metadata when new website message inserted
- **`trigger_auto_link_website_session`** - Automatically links website sessions to customers based on auth user

### Utility Functions
- **`mark_conversation_as_read(conversation_id, channel_type)`** - Marks conversation and messages as read
- **`link_customer_to_line_user(line_user_id, customer_id)`** - Associates LINE user with customer
- **`auto_link_website_session()`** - Trigger function for automatic customer linking

**📖 Full SQL Documentation**: See [Database Documentation](./UNIFIED_CHAT_DATABASE.md)

---

## 🔍 Common Queries

### Get All Active Conversations
```sql
SELECT * FROM unified_conversations
WHERE is_active = true
ORDER BY last_message_at DESC;
```

### Get Messages for a Conversation
```sql
SELECT * FROM unified_messages
WHERE conversation_id = 'your-conversation-id'
ORDER BY created_at ASC;
```

### Find Customer's Conversations Across All Channels
```sql
SELECT * FROM unified_conversations
WHERE customer_id = 'customer-uuid'
ORDER BY last_message_at DESC;
```

### Count Messages by Channel
```sql
SELECT
  channel_type,
  COUNT(*) AS message_count,
  COUNT(DISTINCT conversation_id) AS conversation_count
FROM unified_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY channel_type;
```

---

## 📚 Related Documentation

- **[Unified Chat System Index](./UNIFIED_CHAT_SYSTEM.md)** - Main documentation hub
- **[Database Design Patterns](./UNIFIED_CHAT_DATABASE.md)** - Views, functions, migrations
- **[Architecture Documentation](./UNIFIED_CHAT_ARCHITECTURE.md)** - Technical architecture
- **[API Reference](./UNIFIED_CHAT_API_REFERENCE.md)** - API endpoints using these tables

---

*This database reference provides complete documentation for all 19 tables and 2 views in the Unified Chat System.*
