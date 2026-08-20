-- Migration: Create registrations and saved_posts tables with RLS and indexes

-- 1. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, post_id)
);

-- Optimize queries for specific student lists, posts counts, and sorting paths
CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON public.registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_post_id ON public.registrations(post_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON public.registrations(registered_at);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Select: Students read own, Admins read all
CREATE POLICY "Students can view own registrations" ON public.registrations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all registrations" ON public.registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert: Students insert own registrations (Admins do not register)
CREATE POLICY "Students can insert own registrations" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());


-- 2. Create saved_posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_student_id ON public.saved_posts(student_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Select/Insert/Delete policies: Student actions only (Admins do not need access)
CREATE POLICY "Students can view own saved posts" ON public.saved_posts
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own saved posts" ON public.saved_posts
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete own saved posts" ON public.saved_posts
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());
