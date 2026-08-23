-- Migration 25: SECURITY DEFINER Search Path Hardening & Storage Buckets Upload Restrictions

-- 1. Hardening search_path on all custom SECURITY DEFINER functions in the public schema
ALTER FUNCTION public.check_roll_number_whitelist(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_admin_user(text, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_admin_user(text, text, text, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_admin_user(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_status(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_admin_privilege(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_profile_to_auth() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_admin_status(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_profile_update() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_registration_oia_eligibility() SET search_path = public, pg_temp;

-- 2. Restrict storage upload properties on Supabase storage buckets
-- Limit Announcements bucket to 10MB PDFs and common image formats
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
WHERE id = 'announcements';

-- Limit OIA Documents bucket to 10MB PDFs and common image formats
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
WHERE id = 'oia-documents';

-- Limit Team Members bucket to 5MB common image formats (PDF not allowed here)
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'team-members';
