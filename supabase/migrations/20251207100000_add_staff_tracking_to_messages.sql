-- Migration: Add staff_email tracking to message tables
-- Purpose: Track individual staff members who send messages for SLA analysis
-- Date: 2025-12-07
-- Author: Chat SLA Tracking System

-- Add staff_email column to LINE messages
ALTER TABLE public.line_messages
ADD COLUMN IF NOT EXISTS staff_email VARCHAR(255);

-- Add staff_email column to Website messages
ALTER TABLE public.web_chat_messages
ADD COLUMN IF NOT EXISTS staff_email VARCHAR(255);

-- Add staff_email column to Meta messages
ALTER TABLE public.meta_messages
ADD COLUMN IF NOT EXISTS staff_email VARCHAR(255);

-- Create indexes for SLA queries (filtered indexes for better performance)
CREATE INDEX IF NOT EXISTS idx_line_messages_staff_email
ON public.line_messages(staff_email)
WHERE sender_type = 'admin';

CREATE INDEX IF NOT EXISTS idx_web_chat_messages_staff_email
ON public.web_chat_messages(staff_email)
WHERE sender_type = 'staff';

CREATE INDEX IF NOT EXISTS idx_meta_messages_staff_email
ON public.meta_messages(staff_email)
WHERE sender_type = 'business';

-- Create composite indexes for SLA calculations (conversation + created_at + sender_type)
-- These are critical for finding first staff response after customer messages
CREATE INDEX IF NOT EXISTS idx_line_messages_sla_lookup
ON public.line_messages(conversation_id, created_at, sender_type);

CREATE INDEX IF NOT EXISTS idx_web_chat_messages_sla_lookup
ON public.web_chat_messages(conversation_id, created_at, sender_type);

CREATE INDEX IF NOT EXISTS idx_meta_messages_sla_lookup
ON public.meta_messages(conversation_id, created_at, sender_type);

-- Add comments for documentation
COMMENT ON COLUMN public.line_messages.staff_email IS
'Email of staff member who sent this message (from backoffice.allowed_users). NULL for existing messages or when sender is unknown.';

COMMENT ON COLUMN public.web_chat_messages.staff_email IS
'Email of staff member who sent this message (from backoffice.allowed_users). NULL for existing messages or when sender is unknown.';

COMMENT ON COLUMN public.meta_messages.staff_email IS
'Email of staff member who sent this message (from backoffice.allowed_users). NULL for existing messages or when sender is unknown.';

-- Backward compatibility notes:
-- - All columns allow NULL, so existing messages are not affected
-- - New messages will populate staff_email from session authentication
-- - No data migration needed for existing messages (they will show as "Unknown Staff" in reports)
