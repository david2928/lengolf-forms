-- ============================================================================
-- Migration: Add Conversation Assignment Functionality
-- Date: 2025-12-16
-- Description:
--   Add conversation assignment capability across all chat channels.
--   - Add assigned_to column to web_chat_conversations (missing)
--   - Standardize meta_conversations.assigned_to to TEXT (email format)
--   - Add assignment tracking columns (assigned_at, assigned_by)
--   - Create indexes for filtering by assignee
-- ============================================================================

-- Drop the unified_conversations view temporarily (depends on meta_conversations.assigned_to)
DROP VIEW IF EXISTS public.unified_conversations;

-- Add assigned_to column to web_chat_conversations (missing)
ALTER TABLE public.web_chat_conversations
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

COMMENT ON COLUMN public.web_chat_conversations.assigned_to IS
'Email of staff member assigned to this conversation';

-- Standardize meta_conversations to use TEXT (email) instead of UUID
-- First, drop the foreign key constraint to profiles.id
ALTER TABLE public.meta_conversations
DROP CONSTRAINT IF EXISTS meta_conversations_assigned_to_fkey;

-- Then convert column type from UUID to TEXT
ALTER TABLE public.meta_conversations
ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::TEXT;

COMMENT ON COLUMN public.meta_conversations.assigned_to IS
'Email of staff member assigned to this conversation (standardized to email format, no longer FK to profiles)';

-- Add assignment tracking columns for all conversation tables

-- LINE conversations
ALTER TABLE public.line_conversations
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by TEXT;

COMMENT ON COLUMN public.line_conversations.assigned_at IS
'Timestamp when conversation was assigned';
COMMENT ON COLUMN public.line_conversations.assigned_by IS
'Email of staff member who made the assignment';

-- Web chat conversations
ALTER TABLE public.web_chat_conversations
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by TEXT;

COMMENT ON COLUMN public.web_chat_conversations.assigned_at IS
'Timestamp when conversation was assigned';
COMMENT ON COLUMN public.web_chat_conversations.assigned_by IS
'Email of staff member who made the assignment';

-- Meta conversations
ALTER TABLE public.meta_conversations
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by TEXT;

COMMENT ON COLUMN public.meta_conversations.assigned_at IS
'Timestamp when conversation was assigned';
COMMENT ON COLUMN public.meta_conversations.assigned_by IS
'Email of staff member who made the assignment';

-- Create indexes for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_line_conversations_assigned_to
ON public.line_conversations(assigned_to)
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_web_chat_conversations_assigned_to
ON public.web_chat_conversations(assigned_to)
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_conversations_assigned_to
ON public.meta_conversations(assigned_to)
WHERE assigned_to IS NOT NULL;

-- Create indexes for assignment timestamp
CREATE INDEX IF NOT EXISTS idx_line_conversations_assigned_at
ON public.line_conversations(assigned_at)
WHERE assigned_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_web_chat_conversations_assigned_at
ON public.web_chat_conversations(assigned_at)
WHERE assigned_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_conversations_assigned_at
ON public.meta_conversations(assigned_at)
WHERE assigned_at IS NOT NULL;

-- Recreate unified_conversations view with updated assigned_to columns
CREATE OR REPLACE VIEW public.unified_conversations AS
-- LINE conversations
SELECT
  'line'::text AS channel_type,
  lc.id,
  lc.line_user_id AS channel_user_id,
  COALESCE(lc.customer_id, lu.customer_id) AS customer_id,
  lc.last_message_at,
  lc.last_message_text,
  lc.last_message_by,
  lc.unread_count,
  lc.is_active,
  lc.assigned_to,
  lc.created_at,
  lc.updated_at,
  lc.is_following,
  lc.marked_unread_at,
  lc.follow_up_at,
  lc.is_spam,
  lc.marked_spam_at,
  jsonb_build_object(
    'line_user_id', lc.line_user_id,
    'display_name', COALESCE(lu.display_name, 'Unknown User'::text),
    'picture_url', lu.picture_url,
    'customer_name', COALESCE(c1.customer_name, c2.customer_name)
  ) AS channel_metadata
FROM line_conversations lc
  LEFT JOIN line_users lu ON lc.line_user_id = lu.line_user_id
  LEFT JOIN customers c1 ON lc.customer_id = c1.id
  LEFT JOIN customers c2 ON lu.customer_id = c2.id
WHERE lc.last_message_text IS NOT NULL AND lc.last_message_text <> ''::text

UNION ALL

-- Website conversations (now includes assigned_to)
SELECT
  'website'::text AS channel_type,
  wcc.id,
  wcc.session_id::text AS channel_user_id,
  COALESCE(wcs.customer_id, p.customer_id) AS customer_id,
  wcc.last_message_at,
  wcc.last_message_text,
  'customer'::text AS last_message_by,
  wcc.unread_count,
  wcc.is_active,
  wcc.assigned_to,  -- Changed from NULL::text to wcc.assigned_to
  wcc.created_at,
  wcc.updated_at,
  wcc.is_following,
  wcc.marked_unread_at,
  wcc.follow_up_at,
  wcc.is_spam,
  wcc.marked_spam_at,
  jsonb_build_object(
    'session_id', wcc.session_id::text,
    'display_name', COALESCE(wcs.display_name, 'Website User'::text),
    'email', wcs.email,
    'customer_name', COALESCE(c1.customer_name, c2.customer_name)
  ) AS channel_metadata
FROM web_chat_conversations wcc
  LEFT JOIN web_chat_sessions wcs ON wcc.session_id::text = wcs.id::text
  LEFT JOIN profiles p ON wcs.user_id = p.id
  LEFT JOIN customers c1 ON wcs.customer_id = c1.id
  LEFT JOIN customers c2 ON p.customer_id = c2.id
WHERE wcc.last_message_text IS NOT NULL AND wcc.last_message_text <> ''::text

UNION ALL

-- Meta conversations (no longer needs ::text casting)
SELECT
  mc.platform AS channel_type,
  mc.id,
  mc.platform_user_id AS channel_user_id,
  COALESCE(mc.customer_id, mu.customer_id) AS customer_id,
  mc.last_message_at,
  mc.last_message_text,
  mc.last_message_by,
  mc.unread_count,
  mc.is_active,
  mc.assigned_to,  -- Changed from mc.assigned_to::text to mc.assigned_to (no cast needed)
  mc.created_at,
  mc.updated_at,
  mc.is_following,
  mc.marked_unread_at,
  mc.follow_up_at,
  mc.is_spam,
  mc.marked_spam_at,
  jsonb_build_object(
    'platform', mc.platform,
    'platform_user_id', mu.platform_user_id,
    'display_name', COALESCE(mu.display_name, 'Meta User'::character varying),
    'profile_pic', mu.profile_pic,
    'phone_number', mu.phone_number,
    'customer_name', COALESCE(c1.customer_name, c2.customer_name)
  ) AS channel_metadata
FROM meta_conversations mc
  LEFT JOIN meta_users mu ON mc.platform_user_id::text = mu.platform_user_id::text
  LEFT JOIN customers c1 ON mc.customer_id = c1.id
  LEFT JOIN customers c2 ON mu.customer_id = c2.id
WHERE mc.last_message_text IS NOT NULL AND mc.last_message_text <> ''::text;

COMMENT ON VIEW public.unified_conversations IS
'Unified view of conversations across all channels (LINE, Website, Meta). Now includes assignment tracking for all channels.';
