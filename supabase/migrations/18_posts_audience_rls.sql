-- Migration 18: Implement OIA-only Posts Security

-- 1. Add audience column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'general' CHECK (audience IN ('general', 'oia'));

-- 2. Drop existing SELECT policies on public.posts
DROP POLICY IF EXISTS "Anyone authenticated can select active public posts" ON public.posts;
DROP POLICY IF EXISTS "Eligible students and admins can select OIA posts" ON public.posts;

-- 3. Re-create SELECT policy for public/general posts
CREATE POLICY "Anyone authenticated can select active public posts" ON public.posts
  FOR SELECT TO authenticated 
  USING (
    is_active = true 
    AND post_type IN ('opportunity', 'announcement')
    AND (audience IS NULL OR audience = 'general')
  );

-- 4. Re-create SELECT policy for OIA posts (visible ONLY to OIA eligible students and admins)
CREATE POLICY "Eligible students and admins can select OIA posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND (post_type = 'oia' OR audience = 'oia')
    AND (
      (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true 
      OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    )
  );

-- 5. Update validation trigger function for registrations
CREATE OR REPLACE FUNCTION public.validate_registration_oia_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- If registering for an OIA post (either type is 'oia' or audience is 'oia')
  IF EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = NEW.post_id
      AND (post_type = 'oia' OR audience = 'oia')
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
