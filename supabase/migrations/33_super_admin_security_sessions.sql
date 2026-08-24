-- Migration 33: Super Admin Security & Logged-in Devices

-- 1. Create admin_sessions table
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE,
  device_name TEXT,
  browser TEXT,
  operating_system TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- 2. Add appropriate indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_id ON public.admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_seen_at ON public.admin_sessions(last_seen_at);

-- 3. Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for admin_sessions
DROP POLICY IF EXISTS "Super Admins can view own sessions" ON public.admin_sessions;
CREATE POLICY "Super Admins can view own sessions" ON public.admin_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Super Admins can update own sessions" ON public.admin_sessions;
CREATE POLICY "Super Admins can update own sessions" ON public.admin_sessions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Super Admins can delete own sessions" ON public.admin_sessions;
CREATE POLICY "Super Admins can delete own sessions" ON public.admin_sessions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Super Admins can insert own sessions" ON public.admin_sessions;
CREATE POLICY "Super Admins can insert own sessions" ON public.admin_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

-- 5. Update admin_activity_logs action check constraint to include session logs
ALTER TABLE public.admin_activity_logs DROP CONSTRAINT IF EXISTS admin_activity_logs_action_check;
ALTER TABLE public.admin_activity_logs ADD CONSTRAINT admin_activity_logs_action_check CHECK (
  action IN (
    'ADMIN_CREATED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_DELETED', 'ADMIN_EDITED', 'ADMIN_ACCESS_RESET',
    'LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'ALL_OTHER_SESSIONS_REVOKED', 'PASSWORD_CHANGED', 'NEW_DEVICE_LOGIN'
  )
);

-- 6. RPC Function: track_admin_session (SECURITY DEFINER)
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
  -- Get currently authenticated user from transaction context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_session_id := auth.session_id();
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No active session identifier';
  END IF;

  -- Extract request IP and User Agent securely from PostgREST headers
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
      AND device_name = p_device_name 
      AND browser = p_browser 
      AND operating_system = p_os
  ) INTO v_device_exists;

  -- Upsert the session record
  INSERT INTO public.admin_sessions (
    user_id,
    session_id,
    device_name,
    browser,
    operating_system,
    ip_address,
    user_agent,
    last_seen_at
  )
  VALUES (
    v_user_id,
    v_session_id,
    p_device_name,
    p_browser,
    p_os,
    v_ip,
    v_ua,
    NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at = NOW(),
    ip_address = v_ip,
    user_agent = v_ua;

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

-- 7. RPC Function: get_active_admin_sessions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_active_admin_sessions()
RETURNS TABLE (
  id UUID,
  session_id UUID,
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

  RETURN QUERY
  SELECT 
    asess.id,
    asess.session_id,
    asess.device_name,
    asess.browser,
    asess.operating_system,
    asess.ip_address,
    asess.created_at,
    asess.last_seen_at,
    (asess.session_id = auth.session_id()) AS is_current
  FROM public.admin_sessions asess
  JOIN auth.sessions s ON asess.session_id = s.id
  WHERE asess.user_id = v_user_id AND asess.revoked_at IS NULL
  ORDER BY asess.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. RPC Function: revoke_admin_session (SECURITY DEFINER)
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

  -- Get session details before modification
  SELECT device_name, browser, operating_system 
  INTO v_device, v_browser, v_os 
  FROM public.admin_sessions 
  WHERE session_id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  -- Delete from auth.sessions (invalidates token refresh)
  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = v_user_id;

  -- Set revoked status in audit logs
  UPDATE public.admin_sessions 
  SET revoked_at = NOW() 
  WHERE session_id = p_session_id AND user_id = v_user_id;

  -- Log security event
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

-- 9. RPC Function: revoke_all_other_admin_sessions (SECURITY DEFINER)
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

  -- Delete all other sessions of this user from Supabase Auth
  DELETE FROM auth.sessions 
  WHERE user_id = v_user_id AND id != v_current_session_id;

  -- Update audit logs for other active sessions
  UPDATE public.admin_sessions 
  SET revoked_at = NOW() 
  WHERE user_id = v_user_id AND session_id != v_current_session_id AND revoked_at IS NULL;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
  VALUES (
    v_user_id,
    'ALL_OTHER_SESSIONS_REVOKED',
    jsonb_build_object('current_session_id', v_current_session_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 10. RPC Function: revoke_all_admin_sessions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.revoke_all_admin_sessions()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all sessions of this user from Supabase Auth
  DELETE FROM auth.sessions WHERE user_id = v_user_id;

  -- Update audit logs for all active sessions
  UPDATE public.admin_sessions 
  SET revoked_at = NOW() 
  WHERE user_id = v_user_id AND revoked_at IS NULL;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, metadata)
  VALUES (
    v_user_id,
    'LOGOUT',
    jsonb_build_object('reason', 'Force security reset - Sign out everywhere')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
