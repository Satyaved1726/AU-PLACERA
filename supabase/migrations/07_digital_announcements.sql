-- Migration 07: Digital Announcements setup

-- Create public.digital_announcements table
CREATE TABLE IF NOT EXISTS public.digital_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  external_url TEXT,
  is_oia BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.digital_announcements ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: All authenticated users can read, but OIA announcements are restricted to OIA eligible students and admins.
CREATE POLICY "Anyone authenticated can read announcements" ON public.digital_announcements
  FOR SELECT TO authenticated
  USING (
    is_oia = false 
    OR (
      (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true 
      OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    )
  );

-- 2. Insert Policy: Only active admins and super admins can create announcements
CREATE POLICY "Admins can insert announcements" ON public.digital_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- 3. Update Policy: Only active admins and super admins can update announcements
CREATE POLICY "Admins can update announcements" ON public.digital_announcements
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- 4. Delete Policy: Only active admins and super admins can delete announcements
CREATE POLICY "Admins can delete announcements" ON public.digital_announcements
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects in 'announcements' bucket
-- Enable select for authenticated users
CREATE POLICY "Public Select on announcements bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'announcements');

-- Enable insert/update/delete for admin/super_admin users
CREATE POLICY "Admins can insert objects to announcements bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcements'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Admins can update objects in announcements bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcements'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Admins can delete objects from announcements bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcements'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );
