-- 1. Add designation and phone columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Alter status check constraint on profiles to support suspended
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'suspended'));

-- Alter admin_activity_logs check constraint to support ADMIN_EDITED
ALTER TABLE public.admin_activity_logs DROP CONSTRAINT IF EXISTS admin_activity_logs_action_check;
ALTER TABLE public.admin_activity_logs ADD CONSTRAINT admin_activity_logs_action_check CHECK (action IN ('ADMIN_CREATED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_DELETED', 'ADMIN_EDITED'));


-- 3. Non-recursive security-defined role functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_status(user_id UUID)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  user_status TEXT;
BEGIN
  SELECT status INTO user_status FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_status, 'active');
END;
$$ LANGUAGE plpgsql;

-- 4. Re-create non-recursive profiles RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Re-create non-recursive posts RLS policies
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
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- 6. Re-create non-recursive activity logs RLS policies
DROP POLICY IF EXISTS "Admins and Super Admins can read activity logs" ON public.admin_activity_logs;

CREATE POLICY "Admins and Super Admins can read activity logs" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Privileged users can write activity logs" ON public.admin_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
    AND public.get_user_status(auth.uid()) = 'active'
  );

-- 7. Redefine RPC stored procedures for super admins using safety checks
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT,
  admin_employee_id TEXT,
  admin_department TEXT,
  admin_designation TEXT,
  admin_phone TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- Check caller authorization
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  IF admin_employee_id IS NULL OR admin_employee_id = '' THEN
    RAISE EXCEPTION 'Employee ID is required.';
  END IF;

  new_user_id := gen_random_uuid();

  -- Insert Auth credentials
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
    now(),
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

  -- Insert Profile record
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    roll_number,
    branch,
    section,
    year,
    batch,
    role,
    oia_eligible,
    status,
    designation,
    phone
  )
  VALUES (
    new_user_id,
    admin_full_name,
    admin_email,
    admin_employee_id,
    admin_department,
    'AIML-A',
    3,
    '2023-2027',
    'admin',
    false,
    'active',
    admin_designation,
    admin_phone
  );

  -- Record audit logs
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    new_user_id,
    'ADMIN_CREATED',
    jsonb_build_object(
      'full_name', admin_full_name,
      'email', admin_email,
      'department', admin_department,
      'employee_id', admin_employee_id,
      'designation', admin_designation,
      'phone', admin_phone
    )
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', new_user_id
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

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
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot deactivate your own Super Admin access.';
  END IF;

  IF new_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status. Must be active or suspended.';
  END IF;

  UPDATE public.profiles
  SET status = new_status, updated_at = now()
  WHERE id = target_id;

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
