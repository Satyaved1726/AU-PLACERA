-- Migration 09: Final fix for create_admin_user RPC function to prevent profiles duplicate key violations and ensure GoTrue compatibility

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
  -- 1. Check caller authorization using database role checking
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- 2. Verify employee ID is provided
  IF admin_employee_id IS NULL OR admin_employee_id = '' THEN
    RAISE EXCEPTION 'Employee ID is required.';
  END IF;

  -- 3. Check if email already exists in auth.users or profiles
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE email = admin_email
  ) THEN
    RAISE EXCEPTION 'An administrator with this email already exists.';
  END IF;

  -- 4. Generate new UUID
  new_user_id := gen_random_uuid();

  -- 5a. Insert Auth credentials with exact GoTrue-required columns
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
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
    admin_email,
    crypt(admin_password, gen_salt('bf', 10)), -- Use 10 rounds for standard bcrypt compatibility
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', new_user_id,
      'email', admin_email,
      'full_name', admin_full_name,
      'roll_number', admin_employee_id,
      'role', 'admin',
      'email_verified', true,
      'phone_verified', false
    ),
    null, -- Must be NULL to match GoTrue default
    'authenticated',
    'authenticated',
    now(),
    now(),
    '', -- confirmation_token must be empty string
    '', -- email_change must be empty string
    '', -- email_change_token_new must be empty string
    ''  -- recovery_token must be empty string
  );

  -- 5b. Insert identity record for GoTrue linking (essential to prevent 'Database error querying schema')
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id::text,
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id,
      'email', admin_email,
      'role', 'admin',
      'full_name', admin_full_name,
      'roll_number', admin_employee_id,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now()
  );

  -- 6. Update the existing Profile record (created by handle_new_user() trigger)
  UPDATE public.profiles
  SET 
    full_name = admin_full_name,
    email = admin_email,
    roll_number = admin_employee_id,
    branch = admin_department,
    section = 'AIML-A',
    year = 3,
    batch = '2023-2027',
    role = 'admin',
    status = 'active',
    designation = admin_designation,
    phone = admin_phone,
    updated_at = now()
  WHERE id = new_user_id;

  -- 7. Fallback: If for some reason the trigger didn't insert the row, insert it now
  IF NOT FOUND THEN
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
  END IF;

  -- 8. Record audit logs
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    new_user_id,
    'ADMIN_CREATED',
    jsonb_build_object(
      'actor_role', caller_role,
      'target_email', admin_email,
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
