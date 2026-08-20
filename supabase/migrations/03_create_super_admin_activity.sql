-- 1. Alter profiles role check constraint to include super_admin
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'student', 'super_admin'));

-- 2. Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- 3. Fix RLS recursion on public.profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
  );

-- 4. Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('ADMIN_CREATED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_DELETED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on activity logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins and Super Admins can select logs
CREATE POLICY "Admins and Super Admins can read activity logs" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
  );

-- 5. RPC Function: Create admin user (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT,
  admin_employee_id TEXT,
  admin_department TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- Check if caller is super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- Verify employee ID is provided
  IF admin_employee_id IS NULL OR admin_employee_id = '' THEN
    RAISE EXCEPTION 'Employee ID is required.';
  END IF;

  -- Generate a new UUID for the admin user
  new_user_id := gen_random_uuid();

  -- Insert into auth.users (Supabase internal table)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(), -- Auto-confirm since administrator was created by super admin
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', admin_full_name,
      'roll_number', admin_employee_id,
      'role', 'admin'
    ),
    false,
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- Create database profile row directly
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    roll_number, -- holds Employee ID
    branch,      -- defaults to 'AIML'
    section,     -- default to 'AIML-A' for admin profile
    year,        -- default to 3
    batch,       -- default to '2023-2027'
    role,
    oia_eligible,
    status
  )
  VALUES (
    new_user_id,
    admin_full_name,
    admin_email,
    admin_employee_id,
    'AIML',
    'AIML-A',
    3,
    '2023-2027',
    'admin',
    false,
    'active'
  );

  -- Insert activity log
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    new_user_id,
    'ADMIN_CREATED',
    jsonb_build_object(
      'full_name', admin_full_name,
      'email', admin_email,
      'department', admin_department,
      'employee_id', admin_employee_id
    )
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', new_user_id
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC Function: Update administrator status
CREATE OR REPLACE FUNCTION public.update_admin_status(
  target_id UUID,
  new_status TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  -- Check if caller is super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- Prevent self-deactivation
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot deactivate your own Super Admin access.';
  END IF;

  -- Update status in profiles
  UPDATE public.profiles
  SET status = new_status, updated_at = now()
  WHERE id = target_id;

  -- Log activity
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    target_id,
    CASE WHEN new_status = 'active' THEN 'ADMIN_ACTIVATED'::text ELSE 'ADMIN_DEACTIVATED'::text END,
    jsonb_build_object('status', new_status)
  );

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. RPC Function: Remove admin privilege (demote to student)
CREATE OR REPLACE FUNCTION public.remove_admin_privilege(
  target_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  -- Check if caller is super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- Prevent self-demotion
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own Super Admin access.';
  END IF;

  -- Demote role in profiles
  UPDATE public.profiles
  SET role = 'student', updated_at = now()
  WHERE id = target_id;

  -- Update role in auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"role":"student"}'::jsonb
  WHERE id = target_id;

  -- Log activity
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    target_id,
    'ADMIN_ROLE_CHANGED',
    jsonb_build_object('new_role', 'student')
  );

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. RPC Function: Delete admin user
CREATE OR REPLACE FUNCTION public.delete_admin_user(
  target_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  -- Check if caller is super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- Prevent self-deletion
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own Super Admin access.';
  END IF;

  -- Get admin info for logging before delete
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  SELECT 
    auth.uid(),
    target_id,
    'ADMIN_DELETED',
    jsonb_build_object('email', email, 'full_name', full_name)
  FROM public.profiles
  WHERE id = target_id;

  -- Delete auth credentials (deactivates authentication access completely)
  DELETE FROM auth.users WHERE id = target_id;

  -- Check if they have created posts or digital announcements
  IF EXISTS (
    SELECT 1 FROM public.posts WHERE created_by = target_id
  ) OR EXISTS (
    SELECT 1 FROM public.digital_announcements WHERE created_by = target_id
  ) THEN
    -- Preserve identity/history for posts, but deactivate and hide from active roster
    UPDATE public.profiles 
    SET role = 'admin_deleted', status = 'suspended', updated_at = now()
    WHERE id = target_id;
  ELSE
    -- Safe to delete the profile
    DELETE FROM public.profiles WHERE id = target_id;
  END IF;

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;
