-- Migration 13: Fix Profiles Cascade Delete & Foreign Key Constraints
-- Drops foreign key constraints using pg_constraint catalog and recreates them with ON DELETE SET NULL fallbacks to preserve post history.

-- 1. Drop foreign key constraint on public.profiles referencing auth.users(id)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
          AND conrelid = 'public.profiles'::regclass
          AND confrelid = 'auth.users'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Drop and recreate public.posts referencing public.profiles(id) with ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
          AND conrelid = 'public.posts'::regclass
          AND confrelid = 'public.profiles'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 3. Drop and recreate public.digital_announcements referencing public.profiles(id) with ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
          AND conrelid = 'public.digital_announcements'::regclass
          AND confrelid = 'public.profiles'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.digital_announcements DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.digital_announcements
  ADD CONSTRAINT digital_announcements_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Allow actor_id in admin_activity_logs to be nullable (to support SET NULL on delete)
ALTER TABLE public.admin_activity_logs ALTER COLUMN actor_id DROP NOT NULL;

-- 5. Drop and recreate public.admin_activity_logs referencing public.profiles(id) with ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
          AND conrelid = 'public.admin_activity_logs'::regclass
          AND confrelid = 'public.profiles'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.admin_activity_logs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.admin_activity_logs
  ADD CONSTRAINT admin_activity_logs_actor_id_fkey 
  FOREIGN KEY (actor_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE public.admin_activity_logs
  ADD CONSTRAINT admin_activity_logs_target_admin_id_fkey 
  FOREIGN KEY (target_admin_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 6. Update delete_admin_user RPC function to delete both auth credentials and profiles record
CREATE OR REPLACE FUNCTION public.delete_admin_user(
  target_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
  target_email TEXT;
  target_name TEXT;
BEGIN
  -- Check if caller is super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage administrators.';
  END IF;

  -- Prevent self-deletion
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own Super Admin access.';
  END IF;

  -- Get target admin info before deletion for logging
  SELECT email, full_name INTO target_email, target_name 
  FROM public.profiles 
  WHERE id = target_id;

  -- Insert activity log
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    target_id,
    'ADMIN_DELETED',
    jsonb_build_object('email', target_email, 'full_name', target_name)
  );

  -- Delete auth credentials (this deactivates credentials access completely)
  DELETE FROM auth.users WHERE id = target_id;

  -- Delete the profile record from public.profiles
  DELETE FROM public.profiles WHERE id = target_id;

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;
