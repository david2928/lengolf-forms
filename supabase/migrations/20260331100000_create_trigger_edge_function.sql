-- Helper function to invoke Supabase Edge Functions via pg_net.
-- Used by edge functions that need to self-invoke for batch continuation,
-- since fire-and-forget fetch() dies when the edge function runtime shuts down.
CREATE OR REPLACE FUNCTION public.trigger_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb,
  auth_key text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://bisimqmtxjsptehhqpeg.supabase.co';
  the_key text;
  request_id bigint;
BEGIN
  -- Use provided key, or try vault as fallback
  the_key := auth_key;
  IF the_key IS NULL THEN
    SELECT decrypted_secret INTO the_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  END IF;

  IF the_key IS NULL THEN
    RAISE EXCEPTION 'No auth key provided and service_role_key not found in vault';
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || the_key
    ),
    body := payload,
    timeout_milliseconds := 120000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- Grant execute to service_role (edge functions use service role key)
GRANT EXECUTE ON FUNCTION public.trigger_edge_function(text, jsonb, text) TO service_role;
