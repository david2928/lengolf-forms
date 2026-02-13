-- Booking notification trigger
-- Fires an async HTTP request to the booking-notification edge function
-- when bookings are created (confirmed) or cancelled.
-- Uses pg_net for async, non-blocking delivery so the trigger never blocks bookings.
--
-- Authentication:
-- 1. Authorization header with anon key satisfies Supabase gateway JWT verification
-- 2. X-Webhook-Secret header provides actual authentication to the edge function
--
-- Required setup:
-- 1. Add BOOKING_WEBHOOK_SECRET to Edge Function Secrets (Supabase Dashboard)
-- 2. Add matching secret to app_config table:
--    INSERT INTO app_config (key, value) VALUES ('booking_webhook_secret', '<secret>');
-- 3. LINE_CHANNEL_ACCESS_TOKEN must already be in Edge Function Secrets

-- App configuration table for storing settings
-- (Supabase restricts ALTER DATABASE SET for custom GUC parameters)
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.app_config IS 'Application configuration secrets. Only accessible via service_role (RLS enabled, no policies).';

CREATE OR REPLACE FUNCTION public.notify_booking_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  edge_function_url text;
  webhook_secret text;
  anon_key text;
  payload jsonb;
  notification_type text;
BEGIN
  -- Determine if this event needs a notification
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    notification_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    notification_type := 'UPDATE';
  ELSE
    RETURN NEW;
  END IF;

  -- Read webhook secret from app_config table
  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'booking_webhook_secret';

  -- Guard: skip if not configured
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RAISE WARNING 'booking-notification: booking_webhook_secret not configured in app_config, skipping';
    RETURN NEW;
  END IF;

  -- Anon key: public value used to pass Supabase gateway JWT verification
  anon_key := coalesce(
    current_setting('app.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE'
  );

  edge_function_url := coalesce(
    current_setting('app.supabase_url', true),
    'https://bisimqmtxjsptehhqpeg.supabase.co'
  ) || '/functions/v1/booking-notification';

  -- Build minimal payload (only fields the edge function needs)
  payload := jsonb_build_object(
    'type', notification_type,
    'record', jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'phone_number', NEW.phone_number,
      'date', NEW.date,
      'start_time', NEW.start_time,
      'duration', NEW.duration,
      'bay', NEW.bay,
      'number_of_people', NEW.number_of_people,
      'booking_type', NEW.booking_type,
      'customer_notes', NEW.customer_notes,
      'status', NEW.status,
      'customer_id', NEW.customer_id
    ),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('status', OLD.status) ELSE NULL END
  );

  -- Fire async HTTP POST via pg_net
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'X-Webhook-Secret', webhook_secret
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'booking-notification trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_booking_change() IS
  'Sends async notification to booking-notification edge function on booking create/cancel';

-- Create trigger on bookings table
CREATE OR REPLACE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_change();
