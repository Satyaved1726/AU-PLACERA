-- Migration 19: Create Team Members Table and Storage Bucket

-- 1. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('leadership', 'ssra')),
  department TEXT,
  description TEXT,
  photo_path TEXT NOT NULL,
  linkedin_url TEXT,
  github_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on public.team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow select for authenticated active rows" ON public.team_members;
DROP POLICY IF EXISTS "Allow super_admin inserts" ON public.team_members;
DROP POLICY IF EXISTS "Allow super_admin updates" ON public.team_members;
DROP POLICY IF EXISTS "Allow super_admin deletes" ON public.team_members;

-- 4. Create policies for public.team_members
CREATE POLICY "Allow select for authenticated active rows" 
  ON public.team_members FOR SELECT TO authenticated 
  USING (is_active = TRUE OR public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Allow super_admin inserts" 
  ON public.team_members FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Allow super_admin updates" 
  ON public.team_members FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Allow super_admin deletes" 
  ON public.team_members FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.uid()) = 'super_admin');

-- 5. Create storage bucket for team members if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-members', 'team-members', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS on storage objects is handled by default

-- 7. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public select on team-members bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow super_admin write on team-members bucket" ON storage.objects;

-- 8. Create policies for storage.objects under 'team-members' bucket
CREATE POLICY "Allow public select on team-members bucket" 
  ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'team-members');

CREATE POLICY "Allow super_admin write on team-members bucket" 
  ON storage.objects FOR ALL TO authenticated 
  USING (
    bucket_id = 'team-members' 
    AND public.get_user_role(auth.uid()) = 'super_admin'
    AND public.get_user_status(auth.uid()) = 'active'
  )
  WITH CHECK (
    bucket_id = 'team-members' 
    AND public.get_user_role(auth.uid()) = 'super_admin'
    AND public.get_user_status(auth.uid()) = 'active'
  );
