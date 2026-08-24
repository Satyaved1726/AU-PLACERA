-- AU Placera — Consolidated Database Schema Configuration
-- Paste this entire SQL block into your Supabase Dashboard SQL Editor to initialize the database tables.

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  roll_number TEXT UNIQUE,
  branch TEXT DEFAULT 'AIML',
  section TEXT CHECK (section IN ('AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E')),
  year INTEGER CHECK (year BETWEEN 1 AND 4),
  batch TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  oia_eligible BOOLEAN DEFAULT FALSE,
  password_updated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE((new.raw_user_meta_data->>'oia_eligible')::BOOLEAN, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2. POSTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('opportunity', 'announcement', 'oia')),
  company_name TEXT,
  opportunity_title TEXT,
  is_top_priority BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_active ON public.posts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_priority ON public.posts(is_top_priority);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON public.posts(created_by);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_posts_modtime 
  BEFORE UPDATE ON public.posts 
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- SELECT POLICIES
CREATE POLICY "Anyone authenticated can select active public posts" ON public.posts
  FOR SELECT TO authenticated 
  USING (
    is_active = true 
    AND post_type IN ('opportunity', 'announcement')
  );

CREATE POLICY "Eligible students and admins can select OIA posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND post_type = 'oia' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (oia_eligible = true OR role = 'admin')
    )
  );

CREATE POLICY "Admins can select all posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- WRITE POLICIES (Admins only)
CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 3. REGISTRATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON public.registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_post_id ON public.registrations(post_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON public.registrations(registered_at);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own registrations" ON public.registrations
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can insert own registrations" ON public.registrations
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all registrations" ON public.registrations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- 4. SAVED POSTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_student_id ON public.saved_posts(student_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own saved posts" ON public.saved_posts
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can insert own saved posts" ON public.saved_posts
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete own saved posts" ON public.saved_posts
  FOR DELETE TO authenticated USING (student_id = auth.uid());

