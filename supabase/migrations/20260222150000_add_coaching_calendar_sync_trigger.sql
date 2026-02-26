-- Coaching calendar sync trigger
-- Fires an async HTTP request to the coaching-calendar-sync edge function
-- when coaching bookings are created, cancelled, or modified (date/time/bay changes).
-- Uses pg_net for async, non-blocking delivery so the trigger never blocks bookings.
--
-- Only fires for coaching bookings (booking_type LIKE 'Coaching (%').
-- Non-coaching bookings are ignored.
--
-- Authentication:
-- 1. Authorization header with anon key satisfies Supabase gateway JWT verification
-- 2. X-Webhook-Secret header provides actual authentication to the edge function
--
-- Required setup:
-- 1. Add COACHING_CALENDAR_WEBHOOK_SECRET to Edge Function Secrets (Supabase Dashboard)
-- 2. Add matching secret to app_config table:
--    INSERT INTO app_config (key, value) VALUES ('coaching_calendar_webhook_secret', '<secret>');
-- 3. Add Google Calendar credentials to Edge Function Secrets:
--    GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
-- 4. Add coaching calendar IDs to Edge Function Secrets:
--    COACHING_BOSS_CALENDAR_ID, COACHING_NOON_CALENDAR_ID,
--    COACHING_RATCHAVIN_CALENDAR_ID, COACHING_MIN_CALENDAR_ID

CREATE OR REPLACE FUNCTION public.notify_coaching_calendar_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  edge_function_url text;
  webhook_secret text;
  anon_key text;
  payload jsonb;
  sync_action text;
BEGIN
  -- Only process coaching bookings
  IF NEW.booking_type IS NULL OR NEW.booking_type NOT LIKE 'Coaching (%' THEN
    RETURN NEW;
  END IF;

  -- Determine what action is needed
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    sync_action := 'create';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    sync_action := 'cancel';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status = 'confirmed' THEN
    -- Check if date, time, or bay changed (booking modification)
    IF NEW.date IS DISTINCT FROM OLD.date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.duration IS DISTINCT FROM OLD.duration
       OR NEW.bay IS DISTINCT FROM OLD.bay THEN
      sync_action := 'update';
    ELSE
      -- No relevant changes
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Read webhook secret from app_config table
  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'coaching_calendar_webhook_secret';

  -- Guard: skip if not configured
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RAISE WARNING 'coaching-calendar-sync: coaching_calendar_webhook_secret not configured in app_config, skipping';
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
  ) || '/functions/v1/coaching-calendar-sync';

  -- Build payload with booking fields needed for calendar event
  payload := jsonb_build_object(
    'type', TG_OP,
    'action', sync_action,
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
      'customer_id', NEW.customer_id,
      'calendar_events', NEW.calendar_events,
      'is_new_customer', NEW.is_new_customer,
      'package_id', NEW.package_id
    ),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
      'status', OLD.status,
      'date', OLD.date,
      'start_time', OLD.start_time,
      'duration', OLD.duration,
      'bay', OLD.bay,
      'calendar_events', OLD.calendar_events
    ) ELSE NULL END
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
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'coaching-calendar-sync trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_coaching_calendar_change() IS
  'Sends async request to coaching-calendar-sync edge function on coaching booking create/cancel/modify';

-- Ensure calendar sync tracking columns exist on bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS calendar_events jsonb,
  ADD COLUMN IF NOT EXISTS google_calendar_sync_status text;

-- Create trigger on bookings table
-- Uses UPDATE OF to only fire when relevant columns change (prevents re-trigger
-- when edge function writes back calendar_events/google_calendar_sync_status).
-- WHEN clause filters at trigger level so the function is never called for non-coaching bookings.
DROP TRIGGER IF EXISTS coaching_calendar_sync_trigger ON public.bookings;

CREATE TRIGGER coaching_calendar_sync_trigger
  AFTER INSERT OR UPDATE OF status, date, start_time, duration, bay, booking_type ON public.bookings
  FOR EACH ROW
  WHEN (NEW.booking_type LIKE 'Coaching (%')
  EXECUTE FUNCTION public.notify_coaching_calendar_change();
