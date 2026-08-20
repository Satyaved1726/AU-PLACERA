-- Migration 10: RLS Security Enforcement
-- This script replaces recursive subquery RLS checks with security-defined helper functions.

-- 1. POSTS TABLE POLICIES Optimization
DROP POLICY IF EXISTS "Eligible students and admins can select OIA posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can select all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Eligible students and admins can select OIA posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND post_type = 'oia' 
    AND (
      (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true 
      OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can select all posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );


-- 2. REGISTRATIONS TABLE POLICIES Optimization
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;

CREATE POLICY "Admins can view all registrations" ON public.registrations
  FOR SELECT TO authenticated 
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );
