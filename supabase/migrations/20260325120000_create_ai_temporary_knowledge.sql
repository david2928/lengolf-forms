-- Temporary knowledge entries for the AI suggestion system
-- Used for short-lived notices like bay closures, events, equipment issues, etc.
CREATE TABLE public.ai_temporary_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_temp_knowledge_active ON public.ai_temporary_knowledge (is_active, expires_at)
  WHERE is_active = true;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_temporary_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.ai_temporary_knowledge IS 'Short-lived knowledge entries injected into AI suggestion system prompt. Auto-cleaned by pg_cron.';

-- Auto-deactivate expired entries daily at midnight Bangkok time (17:00 UTC)
SELECT cron.schedule(
  'cleanup-expired-temp-knowledge',
  '0 17 * * *',
  $$UPDATE public.ai_temporary_knowledge SET is_active = false WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < now()$$
);
