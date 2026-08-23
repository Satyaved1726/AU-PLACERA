-- Create post_attachments table
CREATE TABLE IF NOT EXISTS public.post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "authenticated_select_visible_post_attachments" ON public.post_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_attachments.post_id
        AND (
          p.is_active = true
          AND (
            p.post_type IN ('opportunity', 'announcement')
            OR (
              p.post_type = 'oia'
              AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND (oia_eligible = true OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin'))
              )
            )
          )
        )
    )
  );

-- WRITE Policies (Admins only)
CREATE POLICY "admins_insert_post_attachments" ON public.post_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "admins_update_post_attachments" ON public.post_attachments
  FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "admins_delete_post_attachments" ON public.post_attachments
  FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Configure Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-attachments',
  'post-attachments',
  false,
  15728640, -- 15MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage SELECT Policy
CREATE POLICY "select_post_attachments_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-attachments'
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = (split_part(objects.name, '/'::text, 1))::uuid
        AND (
          p.is_active = true
          AND (
            p.post_type IN ('opportunity', 'announcement')
            OR (
              p.post_type = 'oia'
              AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND (oia_eligible = true OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin'))
              )
            )
          )
        )
    )
  );

-- Storage WRITE Policies
CREATE POLICY "insert_post_attachments_storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "update_post_attachments_storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'post-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "delete_post_attachments_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-attachments'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );
