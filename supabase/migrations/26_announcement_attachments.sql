-- Migration 26: Create announcement_attachments table and storage bucket configuration

-- Drop existing if exists to reset cleanly
DROP TABLE IF EXISTS public.announcement_attachments CASCADE;

-- 1. Create announcement_attachments table referencing digital_announcements
CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.digital_announcements(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_post ON public.announcement_attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_created_by ON public.announcement_attachments(created_by);

-- 3. Enable RLS and Force RLS
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments FORCE ROW LEVEL SECURITY;

-- 4. Create RLS policies for announcement_attachments table
CREATE POLICY "authenticated_select_visible_attachments" ON public.announcement_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.digital_announcements da
      WHERE da.id = announcement_id
        AND (
          da.is_oia = false 
          OR (
            (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true 
            OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
          )
        )
    )
  );

CREATE POLICY "admins_insert_attachments" ON public.announcement_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "admins_update_attachments" ON public.announcement_attachments
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "admins_delete_attachments" ON public.announcement_attachments
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 5. Create storage bucket for announcement-attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. Create storage RLS policies for announcement-attachments bucket
DROP POLICY IF EXISTS "select_announcement_attachments_storage" ON storage.objects;
CREATE POLICY "select_announcement_attachments_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND CASE 
      WHEN name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' 
      THEN EXISTS (
        SELECT 1 FROM public.digital_announcements da
        WHERE da.id = (split_part(name, '/', 1))::uuid
          AND (
            da.is_oia = false 
            OR (
              (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true 
              OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
            )
          )
      )
      ELSE FALSE
    END
  );

DROP POLICY IF EXISTS "insert_announcement_attachments_storage" ON storage.objects;
CREATE POLICY "insert_announcement_attachments_storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "update_announcement_attachments_storage" ON storage.objects;
CREATE POLICY "update_announcement_attachments_storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "delete_announcement_attachments_storage" ON storage.objects;
CREATE POLICY "delete_announcement_attachments_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );
