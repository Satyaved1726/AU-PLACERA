-- Migration 16: Fix Profiles RLS Policies and Trigger Enforcement

-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Re-create "Users can own profile update"
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Re-create "Admins can update all profiles" allowing admins and super_admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 4. Create trigger to securely prevent students from changing role or oia_eligible
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user modifying the profile is a student, enforce restrictions
  IF auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'student' THEN
    -- Prevent student from changing role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify security roles.';
    END IF;

    -- Prevent student from modifying OIA eligibility
    IF NEW.oia_eligible IS DISTINCT FROM OLD.oia_eligible THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify OIA eligibility status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profile_update ON public.profiles;

CREATE TRIGGER check_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();
