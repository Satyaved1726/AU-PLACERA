-- Migration 14: Fix Create Admin User RPC Function
-- Re-defines create_admin_user with robust validation checks and standard GoTrue column mappings to ensure compatibility and correct profile upserting.
-- Note: 'confirmed_at' is omitted from the auth.users insert because it is a generated column in modern GoTrue schemas.
-- Note: 'id' in auth.identities is passed as UUID to prevent type cast mismatch.

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

  -- 3. Check if email already exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(admin_email))
  ) THEN
    RAISE EXCEPTION 'An administrator/account with this email already exists.';
  END IF;

  -- 4. Check if email already exists in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE email = LOWER(TRIM(admin_email))
  ) THEN
    RAISE EXCEPTION 'An administrator/account with this email already exists.';
  END IF;

  -- 5. Check if employee ID already exists in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE roll_number = TRIM(admin_employee_id)
  ) THEN
    RAISE EXCEPTION 'An administrator/profile with this Employee ID already exists.';
  END IF;

  -- Generate new UUID for the user
  new_user_id := gen_random_uuid();

  -- 6. Insert Auth credentials with GoTrue-required columns (omitting confirmed_at which is generated)
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
    crypt(admin_password, gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', new_user_id,
      'email', LOWER(TRIM(admin_email)),
      'full_name', TRIM(admin_full_name),
      'roll_number', TRIM(admin_employee_id),
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

  -- 7. Insert identity record for GoTrue linking (vital to prevent 'Database error querying schema')
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
    new_user_id, -- Keep as UUID (not ::text)
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
  -- Update the existing Profile record (if created by handle_new_user() trigger)
  UPDATE public.profiles
  SET 
    full_name = TRIM(admin_full_name),
    email = LOWER(TRIM(admin_email)),
    roll_number = TRIM(admin_employee_id),
    branch = admin_department,
    section = 'AIML-A',
    year = 3,
    batch = '2023-2027',
    role = 'admin',
    status = 'active',
    designation = TRIM(admin_designation),
    phone = TRIM(admin_phone),
    updated_at = now()
  WHERE id = new_user_id;

  -- Fallback: If trigger didn't insert the row, insert it now
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
      TRIM(admin_full_name),
      LOWER(TRIM(admin_email)),
      TRIM(admin_employee_id),
      admin_department,
      'AIML-A',
      3,
      '2023-2027',
      'admin',
      false,
      'active',
      TRIM(admin_designation),
      TRIM(admin_phone)
    );
  END IF;

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
$$ LANGUAGE plpgsql;
