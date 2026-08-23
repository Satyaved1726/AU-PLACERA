-- Migration 21: Student Access Whitelist & Lateral Entry Support

-- 1. Add student_type column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_type TEXT DEFAULT 'regular';

-- Ensure check constraint on student_type exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_student_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_student_type_check 
  CHECK (student_type IN ('regular', 'lateral_entry'));

-- 2. Create public.student_access_whitelist table
CREATE TABLE IF NOT EXISTS public.student_access_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  student_type TEXT DEFAULT 'lateral_entry' CHECK (student_type IN ('regular', 'lateral_entry')),
  branch TEXT DEFAULT 'AIML',
  section TEXT DEFAULT 'AIML-F' CHECK (section IN ('AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E', 'AIML-F')),
  academic_year TEXT DEFAULT '4th Year',
  batch TEXT DEFAULT '2023-2027',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on whitelist table
ALTER TABLE public.student_access_whitelist ENABLE ROW LEVEL SECURITY;

-- 3. Configure RLS Policies for public.student_access_whitelist
DROP POLICY IF EXISTS "Allow public SELECT on active whitelist" ON public.student_access_whitelist;
CREATE POLICY "Allow public SELECT on active whitelist" ON public.student_access_whitelist
  FOR SELECT USING (is_active = TRUE OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Allow super_admin full access" ON public.student_access_whitelist;
CREATE POLICY "Allow super_admin full access" ON public.student_access_whitelist
  FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

-- 4. Seed the five lateral-entry roll numbers
INSERT INTO public.student_access_whitelist (roll_number, student_type, branch, section, academic_year, batch, is_active)
VALUES 
  ('24EG507F01', 'lateral_entry', 'AIML', 'AIML-F', '4th Year', '2023-2027', TRUE),
  ('24EG507F02', 'lateral_entry', 'AIML', 'AIML-F', '4th Year', '2023-2027', TRUE),
  ('24EG507F03', 'lateral_entry', 'AIML', 'AIML-F', '4th Year', '2023-2027', TRUE),
  ('24EG507F04', 'lateral_entry', 'AIML', 'AIML-F', '4th Year', '2023-2027', TRUE),
  ('24EG507F05', 'lateral_entry', 'AIML', 'AIML-F', '4th Year', '2023-2027', TRUE)
ON CONFLICT (roll_number) DO UPDATE 
SET 
  student_type = EXCLUDED.student_type,
  branch = EXCLUDED.branch,
  section = EXCLUDED.section,
  academic_year = EXCLUDED.academic_year,
  batch = EXCLUDED.batch,
  is_active = TRUE;

-- 5. Recreate public.handle_new_user() trigger function
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
  whitelist_rec RECORD;
  is_whitelisted BOOLEAN := FALSE;
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
      RAISE EXCEPTION 'Access restricted. AU Placera is currently available only to eligible 4th-year students using their official Anurag University email.';
    END IF;

    -- B. Email prefix must match roll number in lowercase
    IF meta_email NOT LIKE LOWER(meta_roll) || '@%' THEN
      RAISE EXCEPTION 'Access restricted. College email must match the student roll number.';
    END IF;

    -- C. Query the access whitelist
    SELECT * INTO whitelist_rec 
    FROM public.student_access_whitelist 
    WHERE UPPER(roll_number) = meta_roll AND is_active = TRUE;

    IF whitelist_rec.id IS NOT NULL THEN
      is_whitelisted := TRUE;
    END IF;

    -- D. Conditional evaluation for regular and whitelisted lateral entry students
    IF is_whitelisted THEN
      -- Override profile academic attributes to whitelisted values
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

  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (
    id, full_name, email, roll_number, branch, section, year, batch, role, oia_eligible, student_type
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
    meta_role,
    COALESCE((new.raw_user_meta_data->>'oia_eligible')::BOOLEAN, FALSE),
    CASE WHEN is_whitelisted THEN whitelist_rec.student_type ELSE 'regular' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update public.validate_profile_update() function to protect student_type
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce restrictions only on student accounts
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

    IF NEW.student_type IS DISTINCT FROM OLD.student_type THEN
      RAISE EXCEPTION 'Access Denied: Student accounts are not authorized to modify student types.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
