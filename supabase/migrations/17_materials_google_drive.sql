-- Migration 17: Materials Google Drive Integration Configuration

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.materials_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  drive_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.materials_config ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Authenticated users can read active materials config" ON public.materials_config;
DROP POLICY IF EXISTS "Admins can manage materials config" ON public.materials_config;

-- 4. Create SELECT policy (all authenticated users can read active configs)
CREATE POLICY "Authenticated users can read active materials config" ON public.materials_config
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 5. Create admin management policy (admins and super_admins can execute all operations)
CREATE POLICY "Admins can manage materials config" ON public.materials_config
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- 6. Seed default Google Drive folder url
INSERT INTO public.materials_config (title, description, drive_url, is_active)
VALUES (
  'Preparation Materials',
  'Access curated aptitude worksheets, coding resources, and interview prep guides from the university drive.',
  'https://drive.google.com/drive/folders/13yZ2ObuBam41_jrkKhxPyuCx8BmEpxZR',
  true
)
ON CONFLICT DO NOTHING;
