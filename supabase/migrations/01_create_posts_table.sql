-- Migration: Create posts table, triggers, indexes, and RLS policies

-- Create posts table
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

-- Performance optimization indexes
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

-- Trigger definition
CREATE TRIGGER update_posts_modtime 
  BEFORE UPDATE ON public.posts 
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- SELECT POLICIES
-- Students/Admins can read active public posts
CREATE POLICY "Anyone authenticated can select active public posts" ON public.posts
  FOR SELECT TO authenticated 
  USING (
    is_active = true 
    AND post_type IN ('opportunity', 'announcement')
  );

-- OIA eligible students and admins can select OIA posts
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

-- Admins can read archived or all posts
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
