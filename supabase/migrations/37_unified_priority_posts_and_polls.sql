-- ==============================================================================
-- Migration 37: Unified Priority System for Posts and Polls
-- ==============================================================================
-- Implements time-bound and manual priority for Posts/Announcements/Opportunities
-- and WhatsApp-style Polls with automatic feed demotion upon expiration.

-- 1. ADD PRIORITY COLUMNS TO POSTS
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_duration TEXT DEFAULT '24_hours';

-- Sync initial is_priority with existing is_top_priority
UPDATE public.posts
SET is_priority = is_top_priority
WHERE is_priority IS NULL OR (is_top_priority = TRUE AND is_priority = FALSE);

-- Index for posts priority queries
CREATE INDEX IF NOT EXISTS idx_posts_priority_expires ON public.posts(is_top_priority, priority_expires_at);

-- Trigger to keep is_priority and is_top_priority seamlessly in sync
CREATE OR REPLACE FUNCTION public.sync_posts_priority_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_priority IS DISTINCT FROM OLD.is_priority THEN
    NEW.is_top_priority := COALESCE(NEW.is_priority, false);
  ELSIF NEW.is_top_priority IS DISTINCT FROM OLD.is_top_priority THEN
    NEW.is_priority := COALESCE(NEW.is_top_priority, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_posts_priority ON public.posts;
CREATE TRIGGER trg_sync_posts_priority
  BEFORE INSERT OR UPDATE OF is_priority, is_top_priority ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_posts_priority_columns();

-- 2. ADD PRIORITY COLUMNS TO POLLS
ALTER TABLE public.polls 
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_duration TEXT DEFAULT '24_hours';

CREATE INDEX IF NOT EXISTS idx_polls_priority_expires ON public.polls(is_priority, priority_expires_at);

-- 3. HELPER RPC FOR SETTING POST PRIORITY
CREATE OR REPLACE FUNCTION public.set_post_priority(
  p_post_id UUID,
  p_is_priority BOOLEAN,
  p_duration TEXT DEFAULT '24_hours',
  p_custom_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_started_at TIMESTAMPTZ := NULL;
  v_expires_at TIMESTAMPTZ := NULL;
  v_caller_role TEXT;
  v_updated_post RECORD;
BEGIN
  -- Verify caller is admin or super_admin
  v_caller_role := public.get_user_role(auth.uid());
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify priority settings.';
  END IF;

  IF p_is_priority THEN
    v_started_at := NOW();
    IF p_duration = '24_hours' THEN
      v_expires_at := NOW() + INTERVAL '24 hours';
    ELSIF p_duration = '3_days' THEN
      v_expires_at := NOW() + INTERVAL '3 days';
    ELSIF p_duration = '7_days' THEN
      v_expires_at := NOW() + INTERVAL '7 days';
    ELSIF p_duration = 'custom' THEN
      IF p_custom_expires_at IS NULL OR p_custom_expires_at <= NOW() THEN
        RAISE EXCEPTION 'Custom expiration date must be in the future.';
      END IF;
      v_expires_at := p_custom_expires_at;
    ELSIF p_duration = 'manual' THEN
      v_expires_at := NULL;
    ELSE
      -- Default to 24 hours if unknown duration string passed
      v_expires_at := NOW() + INTERVAL '24 hours';
    END IF;
  END IF;

  UPDATE public.posts
  SET 
    is_top_priority = p_is_priority,
    is_priority = p_is_priority,
    priority_started_at = v_started_at,
    priority_expires_at = v_expires_at,
    priority_duration = CASE WHEN p_is_priority THEN p_duration ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_post_id
  RETURNING id, is_top_priority, is_priority, priority_started_at, priority_expires_at, priority_duration INTO v_updated_post;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post with id % not found.', p_post_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', v_updated_post.id,
    'is_priority', v_updated_post.is_priority,
    'priority_started_at', v_updated_post.priority_started_at,
    'priority_expires_at', v_updated_post.priority_expires_at,
    'priority_duration', v_updated_post.priority_duration
  );
END;
$$ LANGUAGE plpgsql;

-- 4. HELPER RPC FOR SETTING POLL PRIORITY
CREATE OR REPLACE FUNCTION public.set_poll_priority(
  p_poll_id UUID,
  p_is_priority BOOLEAN,
  p_duration TEXT DEFAULT '24_hours',
  p_custom_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_started_at TIMESTAMPTZ := NULL;
  v_expires_at TIMESTAMPTZ := NULL;
  v_caller_role TEXT;
  v_updated_poll RECORD;
BEGIN
  -- Verify caller is admin or super_admin
  v_caller_role := public.get_user_role(auth.uid());
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify priority settings.';
  END IF;

  IF p_is_priority THEN
    v_started_at := NOW();
    IF p_duration = '24_hours' THEN
      v_expires_at := NOW() + INTERVAL '24 hours';
    ELSIF p_duration = '3_days' THEN
      v_expires_at := NOW() + INTERVAL '3 days';
    ELSIF p_duration = '7_days' THEN
      v_expires_at := NOW() + INTERVAL '7 days';
    ELSIF p_duration = 'custom' THEN
      IF p_custom_expires_at IS NULL OR p_custom_expires_at <= NOW() THEN
        RAISE EXCEPTION 'Custom expiration date must be in the future.';
      END IF;
      v_expires_at := p_custom_expires_at;
    ELSIF p_duration = 'manual' THEN
      v_expires_at := NULL;
    ELSE
      -- Default to 24 hours if unknown duration string passed
      v_expires_at := NOW() + INTERVAL '24 hours';
    END IF;
  END IF;

  UPDATE public.polls
  SET 
    is_priority = p_is_priority,
    priority_started_at = v_started_at,
    priority_expires_at = v_expires_at,
    priority_duration = CASE WHEN p_is_priority THEN p_duration ELSE NULL END
  WHERE id = p_poll_id
  RETURNING id, is_priority, priority_started_at, priority_expires_at, priority_duration INTO v_updated_poll;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll with id % not found.', p_poll_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'poll_id', v_updated_poll.id,
    'is_priority', v_updated_poll.is_priority,
    'priority_started_at', v_updated_poll.priority_started_at,
    'priority_expires_at', v_updated_poll.priority_expires_at,
    'priority_duration', v_updated_poll.priority_duration
  );
END;
$$ LANGUAGE plpgsql;

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
