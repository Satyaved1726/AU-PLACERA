-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_config',
  university_name TEXT NOT NULL DEFAULT 'Anurag University',
  application_name TEXT NOT NULL DEFAULT 'AU Placera',
  department TEXT NOT NULL DEFAULT 'AIML',
  academic_year TEXT NOT NULL DEFAULT '2023-2027',
  placement_season TEXT NOT NULL DEFAULT '2026-2027',
  registration_available BOOLEAN NOT NULL DEFAULT true,
  default_priority BOOLEAN NOT NULL DEFAULT false,
  opportunity_visibility TEXT NOT NULL DEFAULT 'all'
);

-- Seed default configuration row
INSERT INTO public.system_settings (id, university_name, application_name, department, academic_year, placement_season, registration_available, default_priority, opportunity_visibility)
VALUES ('default_config', 'Anurag University', 'AU Placera', 'AIML', '2023-2027', '2026-2027', true, false, 'all')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: anyone authenticated can read settings
CREATE POLICY "Anyone authenticated can read settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

-- Write policy: only super admins can update settings
CREATE POLICY "Super Admins can update settings" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
  );
