-- Migration 11: Drop auth cascade constraint, fix branch check, and update delete_admin_user function to preserve profiles safely

-- 1. Drop foreign key cascade constraint on profiles so profiles can persist after auth.users deletion
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Drop branch constraint to allow other departments (e.g. CSE, IT, ECE) to be saved
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_branch_check;

-- 3. Update foreign key constraint on public.posts to use ON DELETE SET NULL as a safe fallback
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_created_by_fkey;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Update RPC function public.delete_admin_user to conditionally preserve profile details
CREATE OR REPLACE FUNCTION public.delete_admin_user(
  target_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
  has_posts BOOLEAN;
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

  -- Get admin info for logging before delete
  INSERT INTO public.admin_activity_logs (actor_id, target_admin_id, action, metadata)
  SELECT 
    auth.uid(),
    target_id,
    'ADMIN_DELETED',
    jsonb_build_object('email', email, 'full_name', full_name)
  FROM public.profiles
  WHERE id = target_id;

  -- Delete auth credentials (deactivates authentication access completely)
  DELETE FROM auth.users WHERE id = target_id;

  -- Check if they have created posts or digital announcements
  SELECT EXISTS (
    SELECT 1 FROM public.posts WHERE created_by = target_id
  ) OR EXISTS (
    SELECT 1 FROM public.digital_announcements WHERE created_by = target_id
  ) INTO has_posts;

  IF has_posts THEN
    -- Preserve identity/history for posts, but deactivate and hide from active roster
    UPDATE public.profiles 
    SET role = 'admin_deleted', status = 'suspended', updated_at = now()
    WHERE id = target_id;
  ELSE
    -- Safe to delete the profile since they have no posts
    DELETE FROM public.profiles WHERE id = target_id;
  END IF;

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;
