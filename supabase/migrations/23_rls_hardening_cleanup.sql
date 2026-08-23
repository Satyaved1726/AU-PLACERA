-- Migration 23: Clean up duplicate and dangerous RLS policies, force RLS on all tables

-- 1. Profiles Table Policies Cleanup
DROP POLICY IF EXISTS "Anyone authenticated can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Re-create clean UPDATE policies on Profiles
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 2. Posts Table Policies Cleanup
DROP POLICY IF EXISTS "Authenticated users can view active posts" ON public.posts;
DROP POLICY IF EXISTS "Admins and super admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins and super admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins and super admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

-- Re-create clean INSERT/UPDATE/DELETE policies on Posts
CREATE POLICY "Admins and super admins can insert posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins and super admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins and super admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 3. Force Row Level Security on all 10 tables to ensure it cannot be bypassed
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.registrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.materials_config FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.student_access_whitelist FORCE ROW LEVEL SECURITY;
ALTER TABLE public.digital_announcements FORCE ROW LEVEL SECURITY;
