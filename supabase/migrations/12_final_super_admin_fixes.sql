-- Migration 12: Final Super Admin Fixes
-- Decouples profiles from auth deletion cascades, updates delete RPC function to preserve history safely, and establishes automatic profile-to-auth sync triggers.

-- 1. Update profiles role check constraint to allow 'admin_deleted'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'student', 'super_admin', 'admin_deleted'));

-- 2. Decouple public.profiles from auth.users delete cascades
-- We drop any foreign key constraints on public.profiles referencing auth.users(id)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'profiles' 
          AND ccu.table_name = 'users'
          AND ccu.table_schema = 'auth'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 3. Update public.posts created_by foreign key fallback
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'posts' 
          AND ccu.table_name = 'profiles'
          AND ccu.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Update public.digital_announcements created_by foreign key fallback
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'digital_announcements' 
          AND ccu.table_name = 'profiles'
          AND ccu.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.digital_announcements DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.digital_announcements
  ADD CONSTRAINT digital_announcements_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 5. Re-create public.delete_admin_user RPC function
CREATE OR REPLACE FUNCTION public.delete_admin_user(
  target_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
  has_history BOOLEAN;
  target_email TEXT;
  target_roll TEXT;
  suffix TEXT;
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

  -- Get target admin info before deletion
  SELECT email, roll_number INTO target_email, target_roll 
  FROM public.profiles 
  WHERE id = target_id;

  -- Insert activity log
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  VALUES (
    auth.uid(),
    target_id,
    'ADMIN_DELETED',
    jsonb_build_object('email', target_email, 'full_name', (SELECT full_name FROM public.profiles WHERE id = target_id))
  );

  -- Delete auth credentials (this deactivates credentials access completely)
  DELETE FROM auth.users WHERE id = target_id;

  -- Check if the administrator has any associated history
  SELECT EXISTS (
    SELECT 1 FROM public.posts WHERE created_by = target_id
  ) OR EXISTS (
    SELECT 1 FROM public.digital_announcements WHERE created_by = target_id
  ) OR EXISTS (
    SELECT 1 FROM public.admin_activity_logs WHERE actor_id = target_id OR target_admin_id = target_id
  ) INTO has_history;

  IF has_history THEN
    -- Generate unique suffix to avoid email/employee ID conflicts
    suffix := '_deleted_' || to_char(now(), 'YYYYMMDDHH24MISS');
    
    -- Preserve identity/history, but update status and change unique identifiers to free them up
    UPDATE public.profiles 
    SET 
      role = 'admin_deleted', 
      status = 'suspended', 
      email = target_email || suffix,
      roll_number = COALESCE(target_roll, '') || suffix,
      updated_at = now()
    WHERE id = target_id;
  ELSE
    -- Safe to completely delete the profile
    DELETE FROM public.profiles WHERE id = target_id;
  END IF;

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to sync profiles changes back to auth.users raw_user_meta_data & email
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET 
    raw_user_meta_data = raw_user_meta_data || 
      jsonb_build_object(
        'full_name', NEW.full_name,
        'roll_number', NEW.roll_number,
        'role', NEW.role
      ),
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth();

-- 7. Update activity log action constraints
ALTER TABLE public.admin_activity_logs DROP CONSTRAINT IF EXISTS admin_activity_logs_action_check;
ALTER TABLE public.admin_activity_logs ADD CONSTRAINT admin_activity_logs_action_check CHECK (action IN ('ADMIN_CREATED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_DELETED', 'ADMIN_EDITED', 'ADMIN_ACCESS_RESET'));
