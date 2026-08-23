-- Migration 28: Database & System Monitoring and Management

-- 1. Create monitoring_audit_logs table
CREATE TABLE IF NOT EXISTS public.monitoring_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.monitoring_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow select for super_admin on monitoring logs" ON public.monitoring_audit_logs;
DROP POLICY IF EXISTS "Allow insert for super_admin on monitoring logs" ON public.monitoring_audit_logs;

-- 3. Create RLS policies
CREATE POLICY "Allow select for super_admin on monitoring logs"
  ON public.monitoring_audit_logs FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Allow insert for super_admin on monitoring logs"
  ON public.monitoring_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

-- 4. Create table stats helper function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_table_stats()
RETURNS JSONB
AS $$
DECLARE
  table_rec RECORD;
  result_list JSONB := '[]'::jsonb;
  row_cnt BIGINT;
  size_bytes BIGINT;
BEGIN
  -- Verify the caller is super_admin
  IF public.get_user_role(auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can view table statistics.';
  END IF;

  FOR table_rec IN 
    SELECT n.nspname as schema_name, c.relname as tbl_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
      AND n.nspname IN ('public', 'auth')
      AND c.relname IN (
        'users', 'profiles', 'posts', 'registrations', 'saved_posts', 
        'admin_activity_logs', 'digital_announcements', 
        'announcement_attachments', 'post_attachments', 'team_members',
        'student_access_whitelist', 'system_settings', 'monitoring_audit_logs'
      )
  LOOP
    -- Get row count dynamically
    EXECUTE format('SELECT count(*) FROM %I.%I', table_rec.schema_name, table_rec.tbl_name) INTO row_cnt;
    -- Get size dynamically
    size_bytes := pg_total_relation_size(format('%I.%I', table_rec.schema_name, table_rec.tbl_name));
    
    result_list := result_list || jsonb_build_object(
      'schema', table_rec.schema_name,
      'name', table_rec.tbl_name,
      'rows', row_cnt,
      'size', size_bytes
    );
  END LOOP;
  RETURN result_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

-- 5. Create main get_system_metrics function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_system_metrics()
RETURNS JSONB AS $$
DECLARE
  caller_role TEXT;
  db_size BIGINT;
  total_storage_size BIGINT;
  total_storage_count BIGINT;
  db_conn_count INT;
  db_max_conn INT;
  registered_users_count BIGINT;
  students_count BIGINT;
  admins_count BIGINT;
  super_admins_count BIGINT;
  active_users_mau BIGINT;
  new_users_weekly BIGINT;
  
  overview JSONB;
  database_metrics JSONB;
  storage_metrics JSONB;
  usage_metrics JSONB;
  realtime_metrics JSONB;
  authentication_metrics JSONB;
  system_health JSONB;
  requests_metrics JSONB;
  telemetry_metrics JSONB;
  last_updated TIMESTAMPTZ;
  recent_signins JSONB;
  
  db_health TEXT := 'healthy';
  auth_health TEXT := 'healthy';
  storage_health TEXT := 'healthy';
  
  result JSONB;
BEGIN
  -- 1. Security Check
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can view monitoring metrics.';
  END IF;

  -- 2. Audit
  INSERT INTO public.monitoring_audit_logs (actor_id, action, resource, success, metadata)
  VALUES (auth.uid(), 'Viewed database metrics', 'Dashboard overview', true, '{}'::jsonb);

  -- 3. Compute Metrics
  db_size := pg_database_size(current_database());
  
  SELECT COALESCE(sum((metadata->>'size')::bigint), 0), count(*) 
  INTO total_storage_size, total_storage_count 
  FROM storage.objects;
  
  SELECT count(*) INTO db_conn_count FROM pg_stat_activity;
  SELECT setting::int INTO db_max_conn FROM pg_settings WHERE name = 'max_connections';
  
  SELECT count(*) INTO registered_users_count FROM auth.users;
  SELECT count(*) INTO students_count FROM public.profiles WHERE role = 'student';
  SELECT count(*) INTO admins_count FROM public.profiles WHERE role = 'admin';
  SELECT count(*) INTO super_admins_count FROM public.profiles WHERE role = 'super_admin';
  
  SELECT count(*) INTO active_users_mau FROM auth.users WHERE last_sign_in_at > now() - interval '30 days';
  SELECT count(*) INTO new_users_weekly FROM auth.users WHERE created_at > now() - interval '7 days';

  -- 4. Overview
  overview := jsonb_build_object(
    'dbSize', db_size,
    'storageSize', total_storage_size,
    'storageCount', total_storage_count,
    'dbConnections', db_conn_count,
    'dbMaxConnections', db_max_conn,
    'mau', active_users_mau,
    'newUsersWeekly', new_users_weekly
  );

  -- 5. Database metrics
  database_metrics := jsonb_build_object(
    'size', db_size,
    'quota', 524288000, -- 500 MB
    'connections', db_conn_count,
    'maxConnections', db_max_conn,
    'tables', public.get_table_stats()
  );

  -- 6. Storage details per bucket
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO storage_metrics FROM (
    SELECT jsonb_build_object(
      'name', b.name,
      'public', b.public,
      'objectCount', count(o.id),
      'size', coalesce(sum((o.metadata->>'size')::bigint), 0),
      'allowedMimeTypes', b.allowed_mime_types,
      'fileSizeLimit', b.file_size_limit
    ) as item
    FROM storage.buckets b
    LEFT JOIN storage.objects o ON o.bucket_id = b.id
    GROUP BY b.id, b.name, b.public, b.allowed_mime_types, b.file_size_limit
  ) sub;

  -- 7. Quota compliance
  usage_metrics := jsonb_build_object(
    'database', jsonb_build_object('used', db_size, 'limit', 524288000),
    'storage', jsonb_build_object('used', total_storage_size, 'limit', 1073741824),
    'egress', jsonb_build_object('used', null, 'limit', 5368709120),
    'cachedEgress', jsonb_build_object('used', null, 'limit', 5368709120),
    'mau', jsonb_build_object('used', active_users_mau, 'limit', 50000),
    'realtimeConnections', jsonb_build_object('used', null, 'limit', 200),
    'realtimeMessages', jsonb_build_object('used', null, 'limit', 2000000),
    'edgeFunctions', jsonb_build_object('used', null, 'limit', 500000)
  );

  -- 8. Realtime (telemetry unavailable)
  realtime_metrics := jsonb_build_object(
    'connections', null,
    'peakConnections', null,
    'messages', null,
    'status', 'unavailable',
    'reason', 'Telemetry unavailable through current integration'
  );

  -- 9. Authentication
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO recent_signins FROM (
    SELECT jsonb_build_object(
      'email', regexp_replace(u.email, '^([^@]{1,2})[^@]+@', '\1***@'),
      'role', COALESCE(p.role, 'student'),
      'last_sign_in', u.last_sign_in_at
    ) as item
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.last_sign_in_at IS NOT NULL
    ORDER BY u.last_sign_in_at DESC
    LIMIT 5
  ) sub2;

  authentication_metrics := jsonb_build_object(
    'totalUsers', registered_users_count,
    'students', students_count,
    'admins', admins_count,
    'superAdmins', super_admins_count,
    'activeUsers', active_users_mau,
    'newUsers', new_users_weekly,
    'recentActivity', recent_signins
  );

  -- 10. System Health checks
  -- Simple checks: if table exists and count returns, it's healthy
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles') THEN
    db_health := 'critical';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    auth_health := 'critical';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'buckets' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')) THEN
    storage_health := 'critical';
  END IF;
  
  system_health := jsonb_build_object(
    'supabaseApi', 'healthy',
    'database', db_health,
    'authentication', auth_health,
    'storage', storage_health,
    'realtime', 'healthy'
  );

  -- 11. Requests (telemetry unavailable)
  requests_metrics := jsonb_build_object(
    'count', null,
    'success', null,
    'failed', null,
    'avgResponseTime', null,
    'status', 'unavailable',
    'reason', 'Telemetry unavailable through current integration'
  );

  -- 12. Telemetry: CPU/Memory/Disk
  telemetry_metrics := jsonb_build_object(
    'cpuUsage', null,
    'memoryUsage', null,
    'diskUsage', null,
    'status', 'unavailable',
    'reason', 'Telemetry unavailable through current integration'
  );

  last_updated := now();

  result := jsonb_build_object(
    'overview', overview,
    'database', database_metrics,
    'storage', storage_metrics,
    'usage', usage_metrics,
    'realtime', realtime_metrics,
    'authentication', authentication_metrics,
    'systemHealth', system_health,
    'requests', requests_metrics,
    'telemetry', telemetry_metrics,
    'lastUpdated', last_updated
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

-- 6. Create detect_cleanup_items function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.detect_cleanup_items()
RETURNS TABLE (
  id TEXT,
  file_name TEXT,
  bucket TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ,
  reason TEXT,
  item_type TEXT
) AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 1. Security Check
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can audit storage.';
  END IF;

  -- 2. Audit action
  INSERT INTO public.monitoring_audit_logs (actor_id, action, resource, success, metadata)
  VALUES (auth.uid(), 'Triggered storage cleanup', 'Storage Buckets', true, '{}'::jsonb);

  -- 3. Run Query
  RETURN QUERY
  -- A. Orphaned metadata: record in announcement_attachments but file is missing in storage.objects
  SELECT 
    a.id::text,
    a.file_name,
    'announcement-attachments'::text as bucket,
    a.file_size::bigint as size_bytes,
    a.created_at,
    'Database metadata exists, but file is missing in storage.'::text as reason,
    'metadata_orphaned_announcement'::text as item_type
  FROM public.announcement_attachments a
  LEFT JOIN storage.objects o 
    ON o.bucket_id = 'announcement-attachments' AND o.name = a.file_path
  WHERE o.id IS NULL

  UNION ALL

  -- B. Orphaned metadata: record in post_attachments but file is missing in storage.objects
  SELECT 
    p.id::text,
    p.file_name,
    'post-attachments'::text as bucket,
    p.file_size::bigint as size_bytes,
    p.created_at,
    'Database metadata exists, but file is missing in storage.'::text as reason,
    'metadata_orphaned_post'::text as item_type
  FROM public.post_attachments p
  LEFT JOIN storage.objects o 
    ON o.bucket_id = 'post-attachments' AND o.name = p.file_path
  WHERE o.id IS NULL

  UNION ALL

  -- C. Unreferenced files: file in announcement-attachments bucket but no DB record in announcement_attachments
  SELECT 
    o.id::text,
    o.name as file_name,
    'announcement-attachments'::text as bucket,
    coalesce((o.metadata->>'size')::bigint, 0) as size_bytes,
    o.created_at,
    'Storage file exists, but no database record references it.'::text as reason,
    'file_unreferenced_announcement'::text as item_type
  FROM storage.objects o
  LEFT JOIN public.announcement_attachments a 
    ON o.bucket_id = 'announcement-attachments' AND a.file_path = o.name
  WHERE o.bucket_id = 'announcement-attachments' AND a.id IS NULL

  UNION ALL

  -- D. Unreferenced files: file in post-attachments bucket but no DB record in post_attachments
  SELECT 
    o.id::text,
    o.name as file_name,
    'post-attachments'::text as bucket,
    coalesce((o.metadata->>'size')::bigint, 0) as size_bytes,
    o.created_at,
    'Storage file exists, but no database record references it.'::text as reason,
    'file_unreferenced_post'::text as item_type
  FROM storage.objects o
  LEFT JOIN public.post_attachments p 
    ON o.bucket_id = 'post-attachments' AND p.file_path = o.name
  WHERE o.bucket_id = 'post-attachments' AND p.id IS NULL

  UNION ALL

  -- E. Unreferenced files: file in team-members bucket but no DB record in team_members (matching using pattern since photo_path contains absolute url)
  SELECT 
    o.id::text,
    o.name as file_name,
    'team-members'::text as bucket,
    coalesce((o.metadata->>'size')::bigint, 0) as size_bytes,
    o.created_at,
    'Storage file exists, but no team member photo references it.'::text as reason,
    'file_unreferenced_team'::text as item_type
  FROM storage.objects o
  LEFT JOIN public.team_members t 
    ON o.bucket_id = 'team-members' AND (t.photo_path LIKE '%' || o.name)
  WHERE o.bucket_id = 'team-members' AND t.id IS NULL

  UNION ALL

  -- F. Unreferenced files: file in announcements bucket but no DB record in digital_announcements
  SELECT 
    o.id::text,
    o.name as file_name,
    'announcements'::text as bucket,
    coalesce((o.metadata->>'size')::bigint, 0) as size_bytes,
    o.created_at,
    'Storage file exists, but no announcement banner references it.'::text as reason,
    'file_unreferenced_announcement_banner'::text as item_type
  FROM storage.objects o
  LEFT JOIN public.digital_announcements d 
    ON o.bucket_id = 'announcements' AND (d.image_url LIKE '%' || o.name)
  WHERE o.bucket_id = 'announcements' AND d.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

-- 7. Create delete_orphaned_metadata function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_orphaned_metadata(
  item_id UUID,
  item_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  caller_role TEXT;
  deleted_row RECORD;
  result JSONB;
BEGIN
  -- Check caller is super admin
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can manage database metadata.';
  END IF;

  IF item_type = 'metadata_orphaned_announcement' THEN
    DELETE FROM public.announcement_attachments
    WHERE id = item_id
    RETURNING file_name, file_path INTO deleted_row;
    
    INSERT INTO public.monitoring_audit_logs (actor_id, action, resource, success, metadata)
    VALUES (auth.uid(), 'Deleted orphaned attachment metadata', 'Announcement Attachment: ' || deleted_row.file_name, true, jsonb_build_object('file_path', deleted_row.file_path));
    
    result := jsonb_build_object('success', true, 'message', 'Deleted announcement attachment metadata: ' || deleted_row.file_name);
  ELSIF item_type = 'metadata_orphaned_post' THEN
    DELETE FROM public.post_attachments
    WHERE id = item_id
    RETURNING file_name, file_path INTO deleted_row;
    
    INSERT INTO public.monitoring_audit_logs (actor_id, action, resource, success, metadata)
    VALUES (auth.uid(), 'Deleted orphaned attachment metadata', 'Post Attachment: ' || deleted_row.file_name, true, jsonb_build_object('file_path', deleted_row.file_path));
    
    result := jsonb_build_object('success', true, 'message', 'Deleted post attachment metadata: ' || deleted_row.file_name);
  ELSE
    RAISE EXCEPTION 'Invalid item type: %', item_type;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Create log_monitoring_action function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_monitoring_action(
  action TEXT,
  resource TEXT,
  success BOOLEAN,
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Check caller is super admin
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can write monitoring logs.';
  END IF;

  INSERT INTO public.monitoring_audit_logs (actor_id, action, resource, success, metadata)
  VALUES (auth.uid(), action, resource, success, metadata);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. Explicitly Revoke & Grant EXECUTE permissions to prevent anon/public execution
REVOKE EXECUTE ON FUNCTION public.get_table_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_system_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.detect_cleanup_items() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_orphaned_metadata(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_monitoring_action(TEXT, TEXT, BOOLEAN, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_table_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_system_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.detect_cleanup_items() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_orphaned_metadata(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_monitoring_action(TEXT, TEXT, BOOLEAN, JSONB) TO authenticated, service_role;
