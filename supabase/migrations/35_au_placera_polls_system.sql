-- ==============================================================================
-- Migration 35: AU Placera Polls — Structured Student Polling & Response Analytics
-- ==============================================================================
-- Paste this script into the Supabase Dashboard SQL Editor to initialize the
-- complete polling infrastructure with database constraints, indexes, and RLS.

-- 1. POLLS TABLE
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (poll_type IN ('single_choice', 'multiple_choice')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department TEXT NOT NULL DEFAULT 'AIML',
  batch TEXT NOT NULL DEFAULT '2023-2027',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  allow_response_change BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatic updated_at trigger for polls
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_polls_modtime'
  ) THEN
    CREATE TRIGGER update_polls_modtime
      BEFORE UPDATE ON public.polls
      FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
  END IF;
END $$;

-- Indexes on polls
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_end_date ON public.polls(end_date);

-- 2. POLL AUDIENCE TABLE (Targeting sections: 'ALL' or individual e.g. 'AIML-A')
CREATE TABLE IF NOT EXISTS public.poll_audience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  department TEXT NOT NULL DEFAULT 'AIML',
  batch TEXT NOT NULL DEFAULT '2023-2027',
  section TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_poll_audience_target UNIQUE(poll_id, department, batch, section)
);

CREATE INDEX IF NOT EXISTS idx_poll_audience_poll_id ON public.poll_audience(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_audience_section ON public.poll_audience(section);

-- 3. POLL OPTIONS TABLE (Minimum 2 options per poll)
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON public.poll_options(poll_id, option_order);

-- 4. POLL RESPONSES TABLE (ONE STUDENT = ONE RESPONSE PER POLL)
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_poll_response UNIQUE(poll_id, student_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_poll_responses_modtime'
  ) THEN
    CREATE TRIGGER update_poll_responses_modtime
      BEFORE UPDATE ON public.poll_responses
      FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON public.poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_student_id ON public.poll_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_responded_at ON public.poll_responses(responded_at);

-- 5. POLL RESPONSE OPTIONS TABLE (Maps response to chosen option(s) for single/multi-choice)
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

-- Enable RLS on all 5 tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_audience ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "Students can view targeted active or closed polls" ON public.polls;
CREATE POLICY "Students can view targeted active or closed polls" ON public.polls
  FOR SELECT TO authenticated
  USING (
    status IN ('active', 'closed')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.poll_audience pa ON pa.poll_id = polls.id
      WHERE p.id = auth.uid()
        AND (pa.department = 'ALL' OR pa.department = p.branch)
        AND (pa.batch = 'ALL' OR pa.batch = p.batch)
        AND (pa.section = 'ALL' OR pa.section = p.section)
    )
  );

-- ------------------------------------------------------------------------------
-- B. POLL AUDIENCE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage poll audience" ON public.poll_audience;
CREATE POLICY "Admins can manage poll audience" ON public.poll_audience
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Users can view poll audience for visible polls" ON public.poll_audience;
CREATE POLICY "Users can view poll audience for visible polls" ON public.poll_audience
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_audience.poll_id
    )
  );

-- ------------------------------------------------------------------------------
-- C. POLL OPTIONS POLICIES
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

DROP POLICY IF EXISTS "Users can view options for visible polls" ON public.poll_options;
CREATE POLICY "Users can view options for visible polls" ON public.poll_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_options.poll_id
    )
  );

-- ------------------------------------------------------------------------------
-- D. POLL RESPONSES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all poll responses" ON public.poll_responses;
CREATE POLICY "Admins can view all poll responses" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can delete poll responses" ON public.poll_responses;
CREATE POLICY "Admins can delete poll responses" ON public.poll_responses
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Students can view own poll response" ON public.poll_responses;
CREATE POLICY "Students can view own poll response" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students can insert own response to active poll" ON public.poll_responses;
CREATE POLICY "Students can insert own response to active poll" ON public.poll_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_responses.poll_id
        AND p.status = 'active'
        AND (p.end_date IS NULL OR p.end_date > NOW())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles prof
      JOIN public.poll_audience pa ON pa.poll_id = poll_responses.poll_id
      WHERE prof.id = auth.uid()
        AND (pa.department = 'ALL' OR pa.department = prof.branch)
        AND (pa.batch = 'ALL' OR pa.batch = prof.batch)
        AND (pa.section = 'ALL' OR pa.section = prof.section)
    )
  );

DROP POLICY IF EXISTS "Students can update own response if poll allows changes" ON public.poll_responses;
CREATE POLICY "Students can update own response if poll allows changes" ON public.poll_responses
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_responses.poll_id
        AND p.status = 'active'
        AND p.allow_response_change = TRUE
        AND (p.end_date IS NULL OR p.end_date > NOW())
    )
  )
  WITH CHECK (
    student_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- E. POLL RESPONSE OPTIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all poll response options" ON public.poll_response_options;
CREATE POLICY "Admins can view all poll response options" ON public.poll_response_options
  FOR SELECT TO authenticated
  USING (
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
      JOIN public.polls p ON p.id = pr.poll_id
      WHERE pr.id = poll_response_options.response_id
        AND pr.student_id = auth.uid()
        AND p.status = 'active'
        AND (p.end_date IS NULL OR p.end_date > NOW())
    )
  );

DROP POLICY IF EXISTS "Students can delete own response options on update" ON public.poll_response_options;
CREATE POLICY "Students can delete own response options on update" ON public.poll_response_options
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poll_responses pr
      JOIN public.polls p ON p.id = pr.poll_id
      WHERE pr.id = poll_response_options.response_id
        AND pr.student_id = auth.uid()
        AND p.status = 'active'
        AND p.allow_response_change = TRUE
        AND (p.end_date IS NULL OR p.end_date > NOW())
    )
  );
