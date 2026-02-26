-- Add optional language filter to find_similar_messages
-- Filters both customer message language AND response language to avoid
-- cross-language matches (e.g. English question with Thai staff response).
-- NULL (default) preserves existing behavior (no filter).

CREATE OR REPLACE FUNCTION public.find_similar_messages(
  query_embedding vector,
  similarity_threshold double precision DEFAULT 0.7,
  max_results integer DEFAULT 5,
  exclude_line_message_id uuid DEFAULT NULL::uuid,
  exclude_web_message_id uuid DEFAULT NULL::uuid,
  filter_language text DEFAULT NULL
)
RETURNS TABLE(
  line_message_id uuid,
  web_message_id uuid,
  content text,
  response_used text,
  similarity_score double precision,
  message_category text,
  channel_type text,
  created_at timestamp with time zone,
  curated_image_id uuid,
  image_description text
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    me.line_message_id,
    me.web_message_id,
    me.content,
    me.response_used,
    1 - (me.embedding <=> query_embedding) as similarity_score,
    me.message_category,
    me.channel_type,
    me.created_at,
    me.curated_image_id,
    me.image_description
  FROM message_embeddings me
  WHERE me.embedding IS NOT NULL
    AND (exclude_line_message_id IS NULL OR me.line_message_id != exclude_line_message_id)
    AND (exclude_web_message_id IS NULL OR me.web_message_id != exclude_web_message_id)
    AND (1 - (me.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_language IS NULL OR me.language_detected = filter_language)
    -- Also filter response language: Thai responses contain Thai chars, English ones don't
    AND (
      filter_language IS NULL
      OR me.response_used IS NULL
      OR (filter_language = 'th' AND me.response_used ~ '[\u0E00-\u0E7F]')
      OR (filter_language = 'en' AND me.response_used !~ '[\u0E00-\u0E7F]')
    )
  ORDER BY me.embedding <=> query_embedding
  LIMIT max_results;
$function$;
