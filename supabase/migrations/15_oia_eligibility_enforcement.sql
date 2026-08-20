-- Migration 15: OIA Private Eligibility Access Enforcement

-- 1. Create a secure private bucket for OIA documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('oia-documents', 'oia-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing RLS policies on storage.objects for oia-documents if any
DROP POLICY IF EXISTS "Select oia documents" ON storage.objects;
DROP POLICY IF EXISTS "Insert oia documents" ON storage.objects;
DROP POLICY IF EXISTS "Update oia documents" ON storage.objects;
DROP POLICY IF EXISTS "Delete oia documents" ON storage.objects;

-- 3. Create OIA Storage SELECT policy checking eligibility
CREATE POLICY "Select oia documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'oia-documents'
    AND (
      public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
      OR (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true
    )
  );

-- 4. Create OIA Storage INSERT/UPDATE/DELETE policies for active coordinators/super admins
CREATE POLICY "Insert oia documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'oia-documents'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Update oia documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'oia-documents'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Delete oia documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'oia-documents'
    AND public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- 5. Create database validation function and trigger to restrict registrations to OIA eligible students
CREATE OR REPLACE FUNCTION public.validate_registration_oia_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- If registering for an OIA post
  IF EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = NEW.post_id
      AND post_type = 'oia'
  ) THEN
    -- Verify the student is oia_eligible
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.student_id
        AND oia_eligible = true
    ) THEN
      RAISE EXCEPTION 'Access Denied: Student is not eligible for Office of Industry Alliances (OIA) opportunities.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_registration_oia_eligibility ON public.registrations;

CREATE TRIGGER check_registration_oia_eligibility
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_registration_oia_eligibility();
