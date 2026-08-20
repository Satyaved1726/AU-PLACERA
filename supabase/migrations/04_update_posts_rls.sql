-- Drop existing policies on posts that check role
DROP POLICY IF EXISTS "Eligible students and admins can select OIA posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can select all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

-- Recreate policies with super_admin role check
CREATE POLICY "Eligible students and admins can select OIA posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND post_type = 'oia' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (oia_eligible = true OR role IN ('admin', 'super_admin'))
    )
  );

CREATE POLICY "Admins can select all posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Enable Realtime for public.posts table (Supabase Realtime publication setup)
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
