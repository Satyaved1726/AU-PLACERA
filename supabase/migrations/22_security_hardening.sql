-- Migration 22: AU Placera Production-Grade Security Hardening & Privacy Patches

-- 1. Whitelist Privacy: Drop public read access policy
DROP POLICY IF EXISTS "Allow public SELECT on active whitelist" ON public.student_access_whitelist;

CREATE POLICY "Allow administrative SELECT on whitelist" ON public.student_access_whitelist
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 2. Whitelist Privacy: Secure dynamic lookup RPC function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_roll_number_whitelist(
  roll_num TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  whitelist_rec RECORD;
  result JSONB;
BEGIN
  SELECT section, student_type INTO whitelist_rec
  FROM public.student_access_whitelist
  WHERE UPPER(roll_number) = UPPER(TRIM(roll_num)) AND is_active = TRUE;

  IF whitelist_rec IS NOT NULL THEN
    result := jsonb_build_object(
      'is_whitelisted', true,
      'section', whitelist_rec.section,
      'student_type', whitelist_rec.student_type
    );
  ELSE
    result := jsonb_build_object(
      'is_whitelisted', false
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Profiles: Allow authenticated users to view only their own profile OR admin/super_admin profile data
-- This permits joining Profiles metadata for notice authors (so students can see who posted a notice) without leaking other students' PII.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile or admin details" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR role IN ('admin', 'super_admin')
  );

-- 4. Signup Security: Prevent role spoofing by forcing student role & ineligibility
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
  -- Strict Force Default for signup accounts
  meta_role := 'student';
  meta_email := LOWER(new.email);

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

  -- C. Query the access whitelist via a direct inner query (handle_new_user is SECURITY DEFINER)
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

  -- Insert profile record (strictly hardcoding role and oia_eligible)
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
    'student', -- Strict enforcement
    FALSE,     -- Strict enforcement
    CASE WHEN is_whitelisted THEN whitelist_rec.student_type ELSE 'regular' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Storage Security: Hardening the announcements bucket SELECT policy to restrict OIA poster images
DROP POLICY IF EXISTS "Public Select on announcements bucket" ON storage.objects;

CREATE POLICY "Select announcements storage bucket objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'announcements'
    AND (
      -- If the announcement is not OIA-specific, everyone authenticated can see it
      NOT EXISTS (
        SELECT 1 FROM public.digital_announcements
        WHERE image_url LIKE '%' || name OR description LIKE '%' || name AND is_oia = true
      )
      -- Or the user is an admin or is OIA-eligible
      OR (
        public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
        OR (SELECT oia_eligible FROM public.profiles WHERE id = auth.uid()) = true
      )
    )
  );
