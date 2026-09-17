-- Migration 36: Fix Create Admin User Function, Auth Trigger, and FCM Token Registration

-- 1. Ensure pgcrypto extension is installed in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Drop obsolete 5-argument overload of create_admin_user if it exists
DROP FUNCTION IF EXISTS public.create_admin_user(text, text, text, text, text);

-- 3. Re-define create_admin_user with search_path = public, extensions, pg_temp
-- and schema-qualified extensions.crypt / extensions.gen_salt
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  caller_role TEXT;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- 1. Check caller authorization using database role checking
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- 2. Verify required inputs
  IF admin_employee_id IS NULL OR TRIM(admin_employee_id) = '' THEN
    RAISE EXCEPTION 'Employee ID is required.';
  END IF;

  IF admin_email IS NULL OR TRIM(admin_email) = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;

  IF admin_full_name IS NULL OR TRIM(admin_full_name) = '' THEN
    RAISE EXCEPTION 'Full Name is required.';
  END IF;

  IF admin_password IS NULL OR length(admin_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long.';
  END IF;

  -- 3. Check if email already exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(admin_email))
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists.';
  END IF;

  -- 4. Check if email already exists in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE email = LOWER(TRIM(admin_email))
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists.';
  END IF;

  -- 5. Check if employee ID already exists in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE roll_number = TRIM(admin_employee_id)
  ) THEN
    RAISE EXCEPTION 'An administrator with this Employee ID already exists.';
  END IF;

  -- Generate new UUID for the user
  new_user_id := gen_random_uuid();

  -- 6. Insert Auth credentials with GoTrue-required columns using schema-qualified bcrypt hashing
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    LOWER(TRIM(admin_email)),
    extensions.crypt(admin_password, extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', new_user_id,
      'email', LOWER(TRIM(admin_email)),
      'full_name', TRIM(admin_full_name),
      'roll_number', TRIM(admin_employee_id),
      'department', COALESCE(NULLIF(TRIM(admin_department), ''), 'AIML'),
      'designation', COALESCE(NULLIF(TRIM(admin_designation), ''), 'Coordinator'),
      'phone', COALESCE(TRIM(admin_phone), ''),
      'role', 'admin',
      'email_verified', true,
      'phone_verified', false
    ),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 7. Insert identity record for GoTrue linking
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    new_user_id::text,
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id,
      'email', LOWER(TRIM(admin_email)),
      'role', 'admin',
      'full_name', TRIM(admin_full_name),
      'roll_number', TRIM(admin_employee_id),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now()
  );

  -- 8. Upsert the Profile record:
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
    phone,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    TRIM(admin_full_name),
    LOWER(TRIM(admin_email)),
    TRIM(admin_employee_id),
    COALESCE(NULLIF(TRIM(admin_department), ''), 'AIML'),
    'AIML-A',
    3,
    '2023-2027',
    'admin',
    false,
    'active',
    COALESCE(NULLIF(TRIM(admin_designation), ''), 'Coordinator'),
    COALESCE(TRIM(admin_phone), ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      roll_number = EXCLUDED.roll_number,
      branch = EXCLUDED.branch,
      role = 'admin',
      designation = EXCLUDED.designation,
      phone = EXCLUDED.phone,
      status = 'active',
      updated_at = now();

  -- 9. Record audit logs
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    new_user_id,
    'ADMIN_CREATED',
    jsonb_build_object(
      'full_name', TRIM(admin_full_name),
      'email', LOWER(TRIM(admin_email)),
      'department', admin_department,
      'employee_id', TRIM(admin_employee_id),
      'designation', TRIM(admin_designation),
      'phone', TRIM(admin_phone)
    )
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', new_user_id
  );
  
  RETURN result;
END;
$$;

-- 4. Update handle_new_user() trigger function to handle admin/super_admin roles gracefully
-- while maintaining strict 4th-year student whitelist validation for student signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta_role TEXT;
  meta_roll TEXT;
  meta_email TEXT;
  meta_section TEXT;
  meta_year INTEGER;
  meta_batch TEXT;
  section_char CHAR(1);
  whitelist_rec RECORD;
  is_whitelisted BOOLEAN := FALSE;
BEGIN
  meta_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  meta_email := LOWER(COALESCE(new.email, ''));

  -- A. If the user being created is an administrator or super_admin
  IF meta_role IN ('admin', 'super_admin') THEN
    INSERT INTO public.profiles (
      id, full_name, email, roll_number, branch, section, year, batch, role, oia_eligible, status, designation, phone, created_at, updated_at
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', 'Administrator'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'roll_number', ''),
      COALESCE(new.raw_user_meta_data->>'department', 'AIML'),
      'AIML-A',
      3,
      '2023-2027',
      meta_role,
      FALSE,
      'active',
      COALESCE(new.raw_user_meta_data->>'designation', 'Coordinator'),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        roll_number = EXCLUDED.roll_number,
        branch = EXCLUDED.branch,
        role = EXCLUDED.role,
        designation = EXCLUDED.designation,
        phone = EXCLUDED.phone,
        status = 'active',
        updated_at = NOW();

    RETURN NEW;
  END IF;

  -- B. Strict Student Verification for self-signups
  meta_roll := UPPER(COALESCE(new.raw_user_meta_data->>'roll_number', ''));
  meta_section := UPPER(COALESCE(new.raw_user_meta_data->>'section', ''));
  meta_year := (new.raw_user_meta_data->>'year')::INTEGER;
  meta_batch := COALESCE(new.raw_user_meta_data->>'batch', '');

  -- 1. Validate official email domain
  IF meta_email NOT LIKE '%@anurag.edu.in' THEN
    RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students using their official Anurag University email.';
  END IF;

  -- 2. Email prefix must match roll number in lowercase
  IF meta_email NOT LIKE LOWER(meta_roll) || '@%' THEN
    RAISE EXCEPTION 'Access restricted. College email must match the student roll number.';
  END IF;

  -- 3. Query the access whitelist via direct inner query
  SELECT * INTO whitelist_rec 
  FROM public.student_access_whitelist 
  WHERE UPPER(roll_number) = meta_roll AND is_active = TRUE;

  IF whitelist_rec.id IS NOT NULL THEN
    is_whitelisted := TRUE;
  END IF;

  -- 4. Conditional evaluation for regular and whitelisted lateral entry students
  IF is_whitelisted THEN
    meta_section := UPPER(whitelist_rec.section);
    meta_year := 4; -- Lateral entries are 4th Year students
    meta_batch := COALESCE(whitelist_rec.batch, '2023-2027');
  ELSE
    -- Regular student series matching (23EG107 A-F)
    IF meta_roll NOT SIMILAR TO '23EG107[A-F][0-9A-Z][0-9A-Z]' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

    -- Extract section character and match with meta_section
    section_char := SUBSTRING(meta_roll FROM 8 FOR 1);
    IF meta_section != 'AIML-' || section_char THEN
      RAISE EXCEPTION 'Access restricted. The selected section does not match your roll number.';
    END IF;

    -- Validate year and batch
    IF meta_year != 4 OR meta_batch != '2023-2027' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;
  END IF;

  -- 5. Insert Student Profile record (strictly forcing student role and ineligibility)
  INSERT INTO public.profiles (
    id, full_name, email, roll_number, branch, section, year, batch, role, oia_eligible, student_type, status, created_at, updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'),
    new.email,
    new.raw_user_meta_data->>'roll_number',
    CASE WHEN is_whitelisted THEN whitelist_rec.branch ELSE 'AIML' END,
    meta_section,
    meta_year,
    meta_batch,
    'student',
    FALSE,
    CASE WHEN is_whitelisted THEN whitelist_rec.student_type ELSE 'regular' END,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      roll_number = EXCLUDED.roll_number,
      branch = EXCLUDED.branch,
      section = EXCLUDED.section,
      year = EXCLUDED.year,
      batch = EXCLUDED.batch,
      role = 'student',
      updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 5. Create register_fcm_token function to safely register or re-assign device tokens
CREATE OR REPLACE FUNCTION public.register_fcm_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_token IS NULL OR TRIM(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token cannot be empty');
  END IF;

  INSERT INTO public.fcm_tokens (user_id, token, updated_at)
  VALUES (v_uid, TRIM(p_token), NOW())
  ON CONFLICT (token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Ensure RLS policies on fcm_tokens allow authenticated users to manage their own tokens
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can manage own tokens" ON public.fcm_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
