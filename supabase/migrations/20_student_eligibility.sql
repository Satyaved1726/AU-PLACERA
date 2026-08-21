-- Migration 20: Strict Student Eligibility & Team Schema Expansion

-- 1. Alter public.profiles constraints to support section F
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_section_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_section_check 
  CHECK (section IN ('AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E', 'AIML-F'));

-- 2. Alter year check constraint to restrict to 4th year only for new registrations
-- Note: In the future, to be safe with existing users, let's keep the constraint BETWEEN 1 AND 4, 
-- but validate strict 4th year in handle_new_user function.

-- 3. Expand public.team_members schema
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_category_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_category_check 
  CHECK (category IN ('hod', 'oia', 'placement_coordinator', 'ssra'));

-- 4. Update handle_new_user trigger function with strict eligibility validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role TEXT;
  meta_roll TEXT;
  meta_email TEXT;
  meta_section TEXT;
  meta_year INTEGER;
  meta_batch TEXT;
  section_char CHAR(1);
BEGIN
  meta_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  meta_email := LOWER(new.email);

  IF meta_role = 'student' THEN
    meta_roll := UPPER(COALESCE(new.raw_user_meta_data->>'roll_number', ''));
    meta_section := UPPER(COALESCE(new.raw_user_meta_data->>'section', ''));
    meta_year := (new.raw_user_meta_data->>'year')::INTEGER;
    meta_batch := COALESCE(new.raw_user_meta_data->>'batch', '');

    -- A. Validate official email domain
    IF meta_email NOT LIKE '%@anurag.edu.in' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

    -- B. Validate roll number matches 23EG107 series
    IF meta_roll NOT SIMILAR TO '23EG107[A-F][0-9A-Z][0-9A-Z]' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

    -- C. Validate email matches roll number prefix
    IF meta_email NOT LIKE LOWER(meta_roll) || '@%' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

    -- D. Extract section from roll number and validate matches meta_section
    section_char := SUBSTRING(meta_roll FROM 8 FOR 1);
    IF meta_section != 'AIML-' || section_char THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

    -- E. Validate year is 4 and batch is 2023-2027
    IF meta_year != 4 OR meta_batch != '2023-2027' THEN
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.';
    END IF;

  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, roll_number, branch, section, year, batch, role, oia_eligible)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'),
    new.email,
    new.raw_user_meta_data->>'roll_number',
    'AIML',
    new.raw_user_meta_data->>'section',
    (new.raw_user_meta_data->>'year')::INTEGER,
    new.raw_user_meta_data->>'batch',
    meta_role,
    COALESCE((new.raw_user_meta_data->>'oia_eligible')::BOOLEAN, FALSE)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Extend validate_profile_update trigger function to prevent students from modifying sensitive fields
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

    -- Prevent student from modifying identity/academic info
    IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify roll numbers.';
    END IF;

    IF NEW.batch IS DISTINCT FROM OLD.batch THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify batches.';
    END IF;

    IF NEW.year IS DISTINCT FROM OLD.year THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify academic years.';
    END IF;

    IF NEW.section IS DISTINCT FROM OLD.section THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify sections.';
    END IF;

    IF NEW.branch IS DISTINCT FROM OLD.branch THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify branches.';
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify emails.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
