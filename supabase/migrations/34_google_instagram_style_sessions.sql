-- Migration 34: Google/Instagram-Style Active Sessions

-- 1. Drop existing functions and table to ensure clean rebuild
DROP FUNCTION IF EXISTS public.track_admin_session(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_admin_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.revoke_admin_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_all_other_admin_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.revoke_all_admin_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.revoke_current_admin_session() CASCADE;
DROP TABLE IF EXISTS public.admin_sessions CASCADE;

-- 2. Create the revised admin_sessions table
CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  device_type TEXT,
  device_name TEXT,
  browser TEXT,
  operating_system TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT unique_user_session UNIQUE (user_id, session_id)
);

-- 3. Create indexes
CREATE INDEX idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_session_id ON public.admin_sessions(session_id);
CREATE INDEX idx_admin_sessions_last_seen_at ON public.admin_sessions(last_seen_at);
CREATE INDEX idx_admin_sessions_active_status ON public.admin_sessions(is_active) WHERE is_active = TRUE;

-- 4. Enable RLS
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Super Admins can view own sessions" ON public.admin_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super Admins can update own sessions" ON public.admin_sessions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super Admins can delete own sessions" ON public.admin_sessions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super Admins can insert own sessions" ON public.admin_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

-- 6. Helper Function: parse_ua_sql (IMMUTABLE User Agent parser in SQL)
CREATE OR REPLACE FUNCTION public.parse_ua_sql(ua TEXT)
RETURNS TABLE (
  operating_system TEXT,
  browser TEXT,
  device_type TEXT
) AS $$
DECLARE
  v_os TEXT := 'Unknown OS';
  v_browser TEXT := 'Unknown Browser';
  v_type TEXT := 'Desktop';
BEGIN
  IF ua IS NULL THEN
    RETURN QUERY SELECT v_os, v_browser, v_type;
    RETURN;
  END IF;

  -- OS detection
  IF ua ~* 'windows' THEN
    v_os := 'Windows';
  ELSIF ua ~* 'android' THEN
    v_os := 'Android';
    v_type := 'Mobile';
  ELSIF ua ~* 'ipad' THEN
    v_os := 'iOS';
    v_type := 'Tablet';
  ELSIF ua ~* 'iphone|ipod' THEN
    v_os := 'iOS';
    v_type := 'Mobile';
  ELSIF ua ~* 'macintosh|mac os x' THEN
    v_os := 'macOS';
  ELSIF ua ~* 'linux' THEN
    v_os := 'Linux';
  END IF;

  -- Browser detection
  IF ua ~* 'edge|edg' THEN
    v_browser := 'Edge';
  ELSIF ua ~* 'opr|opios' THEN
    v_browser := 'Opera';
  ELSIF ua ~* 'chrome|crios' THEN
    v_browser := 'Chrome';
  ELSIF ua ~* 'safari' AND NOT (ua ~* 'chrome|crios') THEN
    v_browser := 'Safari';
  ELSIF ua ~* 'firefox|fxios' THEN
    v_browser := 'Firefox';
  END IF;

  -- Device type override check
  IF ua ~* 'tablet' THEN
    v_type := 'Tablet';
  ELSIF ua ~* 'mobile' AND v_type = 'Desktop' THEN
    v_type := 'Mobile';
  END IF;

  RETURN QUERY SELECT v_os, v_browser, v_type;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. RPC Function: track_admin_session (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.track_admin_session(
  p_device_name TEXT,
  p_browser TEXT,
  p_os TEXT
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_ip TEXT;
  v_ua TEXT;
  v_device_exists BOOLEAN;
  v_session_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_session_id := auth.session_id();
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No active session identifier';
  END IF;

  v_ip := COALESCE(
    current_setting('request.headers', true)::jsonb->>'cf-connecting-ip',
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    '127.0.0.1'
  );
  v_ua := COALESCE(
    current_setting('request.headers', true)::jsonb->>'user-agent',
    'Unknown'
  );

  -- Check if session row already exists
  SELECT EXISTS (
    SELECT 1 FROM public.admin_sessions WHERE session_id = v_session_id
  ) INTO v_session_exists;

  -- Check if user has logged in from this device signature before
  SELECT EXISTS (
    SELECT 1 FROM public.admin_sessions 
    WHERE user_id = v_user_id 
      AND session_id != v_session_id
      AND browser = p_browser 
      AND operating_system = p_os
  ) INTO v_device_exists;

  -- Upsert session
  INSERT INTO public.admin_sessions (
    user_id,
    session_id,
    device_type,
    device_name,
    browser,
    operating_system,
    ip_address,
    user_agent,
    last_seen_at,
    is_active
  )
  VALUES (
    v_user_id,
    v_session_id,
    p_device_name,
    p_device_name,
    p_browser,
    p_os,
    v_ip,
    v_ua,
    NOW(),
    TRUE
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at = NOW(),
    ip_address = v_ip,
    user_agent = v_ua,
    is_active = TRUE,
    revoked_at = NULL;

  -- Log security event only on initial tracking of this session
  IF NOT v_session_exists THEN
    IF NOT v_device_exists THEN
      -- Log unrecognized device login
      INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
      VALUES (
        v_user_id,
        'NEW_DEVICE_LOGIN',
        jsonb_build_object(
          'session_id', v_session_id,
          'device_name', p_device_name,
          'browser', p_browser,
          'operating_system', p_os,
          'ip_address', v_ip
        )
      );
    ELSE
      -- Log standard login
      INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
      VALUES (
        v_user_id,
        'LOGIN',
        jsonb_build_object(
          'session_id', v_session_id,
          'device_name', p_device_name,
          'browser', p_browser,
          'operating_system', p_os,
          'ip_address', v_ip
        )
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. RPC Function: get_active_admin_sessions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_active_admin_sessions()
RETURNS TABLE (
  id UUID,
  session_id UUID,
  device_type TEXT,
  device_name TEXT,
  browser TEXT,
  operating_system TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_current BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Backfill any active sessions in auth.sessions not currently tracked in admin_sessions
  INSERT INTO public.admin_sessions (
    user_id,
    session_id,
    device_type,
    device_name,
    browser,
    operating_system,
    ip_address,
    user_agent,
    created_at,
    last_seen_at,
    is_active
  )
  SELECT 
    s.user_id,
    s.id AS session_id,
    parsed.device_type,
    parsed.device_type AS device_name,
    parsed.browser,
    parsed.operating_system,
    COALESCE(s.ip::text, 'Unknown'),
    COALESCE(s.user_agent, 'Unknown'),
    s.created_at,
    s.updated_at,
    TRUE
  FROM auth.sessions s
  LEFT JOIN public.admin_sessions asess ON s.id = asess.session_id
  CROSS JOIN LATERAL public.parse_ua_sql(s.user_agent) parsed
  WHERE s.user_id = v_user_id AND asess.id IS NULL
  ON CONFLICT (session_id) DO NOTHING;

  -- Return active, non-revoked sessions that match the active auth sessions
  RETURN QUERY
  SELECT 
    asess.id,
    asess.session_id,
    asess.device_type,
    asess.device_name,
    asess.browser,
    asess.operating_system,
    asess.ip_address,
    asess.created_at,
    asess.last_seen_at,
    (asess.session_id = auth.session_id()) AS is_current
  FROM public.admin_sessions asess
  JOIN auth.sessions s ON asess.session_id = s.id
  WHERE asess.user_id = v_user_id 
    AND asess.is_active = TRUE 
    AND asess.revoked_at IS NULL
  ORDER BY asess.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. RPC Function: revoke_admin_session (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.revoke_admin_session(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_device TEXT;
  v_browser TEXT;
  v_os TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT device_name, browser, operating_system 
  INTO v_device, v_browser, v_os 
  FROM public.admin_sessions 
  WHERE session_id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  -- Revoke database session in auth
  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = v_user_id;

  -- Mark as inactive in admin_sessions
  UPDATE public.admin_sessions 
  SET revoked_at = NOW(), is_active = FALSE 
  WHERE session_id = p_session_id AND user_id = v_user_id;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
  VALUES (
    v_user_id,
    'SESSION_REVOKED',
    jsonb_build_object(
      'session_id', p_session_id,
      'device_name', v_device,
      'browser', v_browser,
      'operating_system', v_os
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 10. RPC Function: revoke_all_other_admin_sessions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.revoke_all_other_admin_sessions()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_current_session_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_current_session_id := auth.session_id();
  IF v_current_session_id IS NULL THEN
    RAISE EXCEPTION 'No active session identifier';
  END IF;

  -- Revoke in Supabase Auth
  DELETE FROM auth.sessions 
  WHERE user_id = v_user_id AND id != v_current_session_id;

  -- Mark others as revoked in audit logs
  UPDATE public.admin_sessions 
  SET revoked_at = NOW(), is_active = FALSE 
  WHERE user_id = v_user_id AND session_id != v_current_session_id AND is_active = TRUE;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
  VALUES (
    v_user_id,
    'ALL_OTHER_SESSIONS_REVOKED',
    jsonb_build_object('current_session_id', v_current_session_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 11. RPC Function: revoke_current_admin_session (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.revoke_current_admin_session()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_current_session_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    v_current_session_id := auth.session_id();
    IF v_current_session_id IS NOT NULL THEN
      -- Delete from auth.sessions
      DELETE FROM auth.sessions WHERE id = v_current_session_id;
      -- Mark as inactive/revoked in admin_sessions
      UPDATE public.admin_sessions 
      SET revoked_at = NOW(), is_active = FALSE 
      WHERE session_id = v_current_session_id AND user_id = v_user_id;

      -- Log event
      INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
      VALUES (
        v_user_id,
        'LOGOUT',
        jsonb_build_object('session_id', v_current_session_id)
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 12. RPC Function: revoke_all_admin_sessions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.revoke_all_admin_sessions()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all sessions from Supabase Auth
  DELETE FROM auth.sessions WHERE user_id = v_user_id;

  -- Mark all as revoked
  UPDATE public.admin_sessions 
  SET revoked_at = NOW(), is_active = FALSE 
  WHERE user_id = v_user_id AND is_active = TRUE;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
  VALUES (
    v_user_id,
    'LOGOUT',
    jsonb_build_object('reason', 'Force security reset - Sign out everywhere')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
