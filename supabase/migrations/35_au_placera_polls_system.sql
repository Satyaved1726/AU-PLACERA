-- ==============================================================================
-- Migration 35: AU Placera Polls — WhatsApp-Style Student Polling & Analytics
-- ==============================================================================
-- Clean, lightweight polling tables supporting single and multiple answer polls,
-- one vote per student database constraint, and full RLS policies.

-- 1. POLLS TABLE
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  allow_multiple_answers BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);

-- 2. POLL OPTIONS TABLE (Minimum 2 options per poll)
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON public.poll_options(poll_id, option_order);

-- 3. POLL RESPONSES TABLE (ONE VOTE PER STUDENT ENFORCED AT DATABASE LEVEL)
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_poll_response UNIQUE(poll_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON public.poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_student_id ON public.poll_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_voted_at ON public.poll_responses(voted_at DESC);

-- 4. POLL RESPONSE OPTIONS TABLE (Maps student vote to 1 or more options)
CREATE TABLE IF NOT EXISTS public.poll_response_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.poll_responses(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_response_option UNIQUE(response_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_response_options_resp ON public.poll_response_options(response_id);
CREATE INDEX IF NOT EXISTS idx_poll_response_options_opt ON public.poll_response_options(option_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_response_options ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. POLLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all polls" ON public.polls;
CREATE POLICY "Admins can manage all polls" ON public.polls
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Students can view all polls" ON public.polls;
CREATE POLICY "Students can view all polls" ON public.polls
  FOR SELECT TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- B. POLL OPTIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage poll options" ON public.poll_options;
CREATE POLICY "Admins can manage poll options" ON public.poll_options
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Anyone can view poll options" ON public.poll_options
  FOR SELECT TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- C. POLL RESPONSES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all poll responses" ON public.poll_responses;
DROP POLICY IF EXISTS "Admins can view all poll responses" ON public.poll_responses;
DROP POLICY IF EXISTS "Admins can delete poll responses" ON public.poll_responses;
CREATE POLICY "Admins can manage all poll responses" ON public.poll_responses
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Students can view own poll response" ON public.poll_responses;
CREATE POLICY "Students can view own poll response" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students can insert own response" ON public.poll_responses;
CREATE POLICY "Students can insert own response" ON public.poll_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students can update own response" ON public.poll_responses;
CREATE POLICY "Students can update own response" ON public.poll_responses
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students can delete own response" ON public.poll_responses;
CREATE POLICY "Students can delete own response" ON public.poll_responses
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- D. POLL RESPONSE OPTIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all poll response options" ON public.poll_response_options;
DROP POLICY IF EXISTS "Admins can view all poll response options" ON public.poll_response_options;
CREATE POLICY "Admins can manage all poll response options" ON public.poll_response_options
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Students can view own poll response options" ON public.poll_response_options;
CREATE POLICY "Students can view own poll response options" ON public.poll_response_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poll_responses pr
      WHERE pr.id = poll_response_options.response_id
        AND pr.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can insert own poll response options" ON public.poll_response_options;
CREATE POLICY "Students can insert own poll response options" ON public.poll_response_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poll_responses pr
      WHERE pr.id = poll_response_options.response_id
        AND pr.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can delete own poll response options" ON public.poll_response_options;
CREATE POLICY "Students can delete own poll response options" ON public.poll_response_options
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poll_responses pr
      WHERE pr.id = poll_response_options.response_id
        AND pr.student_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 5. PUBLIC AGGREGATED RESULTS RPC (Privacy-Preserving Live Results)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_polls_public_results()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    p.id,
    jsonb_build_object(
      'total_voters', (SELECT COUNT(DISTINCT pr.student_id) FROM public.poll_responses pr WHERE pr.poll_id = p.id),
      'options', COALESCE((
        SELECT jsonb_object_agg(po.id, COALESCE((
          SELECT COUNT(pro.id) 
          FROM public.poll_response_options pro 
          WHERE pro.option_id = po.id
        ), 0))
        FROM public.poll_options po
        WHERE po.poll_id = p.id
      ), '{}'::jsonb)
    )
  ) INTO result
  FROM public.polls p;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 6. RELOAD POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';


