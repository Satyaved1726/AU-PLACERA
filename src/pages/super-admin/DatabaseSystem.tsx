import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { supabase } from '../../lib/supabase';
import {
  Database,
  HardDrive,
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Trash2,
  RefreshCw,
  CheckCircle,
  Users,
  Compass,
  FileCode,
  ShieldAlert,
  Server,
  Layers,
  History,
  Info
} from 'lucide-react';
import {
  getStatusFromPercentage,
  getStatusBadgeVariant
} from '../../features/monitoring/monitoringConfig';

interface TableStat {
  schema: string;
  name: string;
  rows: number;
  size: number;
}

interface BucketStat {
  name: string;
  public: boolean;
  objectCount: number;
  size: number;
  allowedMimeTypes: string[] | null;
  fileSizeLimit: number | null;
}

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  resource: string;
  success: boolean;
  metadata: any;
  created_at: string;
  actor?: {
    full_name: string;
  };
}

interface CleanupItem {
  id: string;
  file_name: string;
  bucket: string;
  size_bytes: number;
  created_at: string;
  reason: string;
  item_type: string;
}

interface SystemMetrics {
  overview: {
    dbSize: number;
    storageSize: number;
    storageCount: number;
    dbConnections: number;
    dbMaxConnections: number;
    mau: number;
    newUsersWeekly: number;
  };
  database: {
    size: number;
    quota: number;
    connections: number;
    maxConnections: number;
    tables: TableStat[];
  };
  storage: BucketStat[];
  usage: {
    database: { used: number; limit: number };
    storage: { used: number; limit: number };
    egress: { used: number | null; limit: number };
    cachedEgress: { used: number | null; limit: number };
    mau: { used: number; limit: number };
    realtimeConnections: { used: number | null; limit: number };
    realtimeMessages: { used: number | null; limit: number };
    edgeFunctions: { used: number | null; limit: number };
  };
  realtime: {
    connections: number | null;
    peakConnections: number | null;
    messages: number | null;
    status: string;
    reason: string;
  };
  authentication: {
    totalUsers: number;
    students: number;
    admins: number;
    superAdmins: number;
    activeUsers: number;
    newUsers: number;
    recentActivity: Array<{
      email: string;
      role: string;
      last_sign_in: string;
    }>;
  };
  systemHealth: {
    supabaseApi: string;
    database: string;
    authentication: string;
    storage: string;
    realtime: string;
  };
  requests: {
    count: number | null;
    success: number | null;
    failed: number | null;
    avgResponseTime: number | null;
    status: string;
    reason: string;
  };
  telemetry: {
    cpuUsage: number | null;
    memoryUsage: number | null;
    diskUsage: number | null;
    status: string;
    reason: string;
  };
  lastUpdated: string;
}

export const DatabaseSystem: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cleanup scan state
  const [scanningCleanup, setScanningCleanup] = useState<boolean>(false);
  const [cleanupItems, setCleanupItems] = useState<CleanupItem[]>([]);
  const [selectedCleanupIds, setSelectedCleanupIds] = useState<string[]>([]);
  const [cleanupScanDone, setCleanupScanDone] = useState<boolean>(false);

  // Table sorting state
  const [dbSortBy, setDbSortBy] = useState<'size' | 'rows'>('size');
  const [dbSortOrder, setDbSortOrder] = useState<'asc' | 'desc'>('desc');

  // Confirmation dialog states
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    item: CleanupItem | null;
    bulk: boolean;
    confirmText: string;
  }>({
    open: false,
    item: null,
    bulk: false,
    confirmText: ''
  });

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      // 1. Fetch main system metrics payload via Postgres RPC
      const { data, error: rpcError } = await supabase.rpc('get_system_metrics');
      if (rpcError) throw rpcError;
      setMetrics(data as SystemMetrics);

      // 2. Fetch recent audit logs from database
      setLoadingLogs(true);
      const { data: logsData, error: logsError } = await supabase
        .from('monitoring_audit_logs')
        .select('*, actor:profiles!actor_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logsError) console.error('Failed to load audit logs:', logsError.message);
      else setAuditLogs(logsData as AuditLog[]);
      
      setLoadingLogs(false);
    } catch (err: any) {
      console.error('[MONITORING] Fetch error:', err);
      setError(err.message || 'An unexpected error occurred while fetching telemetry data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleScanCleanup = async () => {
    setScanningCleanup(true);
    setSelectedCleanupIds([]);
    try {
      const { data, error: rpcError } = await supabase.rpc('detect_cleanup_items');
      if (rpcError) throw rpcError;
      setCleanupItems(data as CleanupItem[]);
      setCleanupScanDone(true);
    } catch (err: any) {
      console.error('[CLEANUP] Scan error:', err);
      alert('Cleanup scan failed: ' + err.message);
    } finally {
      setScanningCleanup(false);
    }
  };

  const handleDeleteItem = (item: CleanupItem) => {
    setConfirmDeleteModal({
      open: true,
      item: item,
      bulk: false,
      confirmText: ''
    });
  };

  const handleBulkDelete = () => {
    if (selectedCleanupIds.length === 0) return;
    setConfirmDeleteModal({
      open: true,
      item: null,
      bulk: true,
      confirmText: ''
    });
  };

  const executeDeletion = async () => {
    const { item, bulk } = confirmDeleteModal;
    setConfirmDeleteModal(prev => ({ ...prev, open: false }));
    setLoading(true);

    try {
      const targets = bulk 
        ? cleanupItems.filter(i => selectedCleanupIds.includes(i.id))
        : [item!];

      for (const target of targets) {
        if (target.item_type.startsWith('metadata_orphaned_')) {
          // Deleting orphaned database metadata
          const { error: deleteError } = await supabase.rpc('delete_orphaned_metadata', {
            item_id: target.id,
            item_type: target.item_type
          });
          if (deleteError) throw deleteError;
        } else {
          // Deleting unreferenced storage file
          const { error: storageError } = await supabase.storage
            .from(target.bucket)
            .remove([target.file_name]);
          
          if (storageError) throw storageError;

          // Log the storage deletion action safely in the backend audit log
          await supabase.rpc('log_monitoring_action', {
            action: 'Deleted unreferenced storage file',
            resource: `${target.bucket}/${target.file_name}`,
            success: true,
            metadata: { size: target.size_bytes }
          });
        }
      }

      alert('Item(s) deleted successfully.');
      // Re-fetch cleanup scan & dashboard stats
      await handleScanCleanup();
      await fetchMetrics();
    } catch (err: any) {
      console.error('[CLEANUP] Delete failed:', err);
      alert('Failed to delete item(s): ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return 'Unavailable';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercent = (value: number | null | undefined, limit: number): string => {
    if (value === null || value === undefined) return '0%';
    const pct = (value / limit) * 100;
    return pct.toFixed(1) + '%';
  };

  const getPercentValue = (value: number | null | undefined, limit: number): number => {
    if (value === null || value === undefined) return 0;
    return (value / limit) * 100;
  };

  const getStatusTextAndColor = (value: number | null | undefined, limit: number): { text: string; color: string } => {
    if (value === null || value === undefined) return { text: 'Healthy', color: 'text-emerald-500' };
    const pct = (value / limit) * 100;
    const status = getStatusFromPercentage(pct);
    
    if (status === 'Healthy') return { text: 'Healthy', color: 'text-emerald-500' };
    if (status === 'Warning') return { text: 'Warning', color: 'text-amber-500' };
    if (status === 'High Usage') return { text: 'High Usage', color: 'text-orange-500' };
    return { text: 'Critical', color: 'text-red-500' };
  };

  const handleSortDb = (field: 'size' | 'rows') => {
    if (dbSortBy === field) {
      setDbSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDbSortBy(field);
      setDbSortOrder('desc');
    }
  };

  const getSortedTables = (tables: TableStat[]): TableStat[] => {
    return [...tables].sort((a, b) => {
      const valA = dbSortBy === 'size' ? a.size : a.rows;
      const valB = dbSortBy === 'size' ? b.size : b.rows;
      return dbSortOrder === 'asc' ? valA - valB : valB - valA;
    });
  };

  const getHealthDotColor = (status: string | undefined): string => {
    if (!status) return 'bg-slate-400';
    const s = status.toLowerCase();
    if (s === 'healthy') return 'bg-emerald-500';
    if (s === 'warning') return 'bg-amber-500';
    if (s === 'high usage' || s === 'high') return 'bg-orange-500';
    if (s === 'critical' || s === 'error') return 'bg-red-500';
    return 'bg-slate-400';
  };

  const getAlertBanners = () => {
    if (!metrics) return null;
    const banners: React.ReactNode[] = [];

    // Database size warning
    const dbPct = (metrics.overview.dbSize / 524288000) * 100;
    if (dbPct >= 70) {
      const dbStatus = getStatusFromPercentage(dbPct);
      banners.push(
        <div key="db-warning" className={`p-4 rounded-xl border flex items-start gap-3 select-none ${dbPct >= 95 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">Database Size Alert: {dbStatus}</h4>
            <p className="text-[11px] mt-0.5 font-semibold">
              Database usage has reached {dbPct.toFixed(1)}% of the configured limit ({formatBytes(metrics.overview.dbSize)} / 500 MB).
            </p>
          </div>
        </div>
      );
    }

    // Storage size warning
    const storagePct = (metrics.overview.storageSize / 1073741824) * 100;
    if (storagePct >= 70) {
      const storageStatus = getStatusFromPercentage(storagePct);
      banners.push(
        <div key="storage-warning" className={`p-4 rounded-xl border flex items-start gap-3 select-none ${storagePct >= 95 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">Storage Limit Alert: {storageStatus}</h4>
            <p className="text-[11px] mt-0.5 font-semibold">
              Storage usage has reached {storagePct.toFixed(1)}% of the configured limit ({formatBytes(metrics.overview.storageSize)} / 1 GB).
            </p>
          </div>
        </div>
      );
    }

    return banners.length > 0 ? <div className="space-y-3">{banners}</div> : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <h2 className="text-xl font-black text-red-600 uppercase">Dashboard Loading Error</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700">{error || 'Unable to connect to database metrics. Check configuration.'}</p>
        </div>
        <button
          onClick={() => fetchMetrics()}
          className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase rounded-lg shadow-md hover:bg-primary-dark transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-16 px-4 sm:px-0 font-sans">
      
      {/* Executive Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
              Database & System Observability
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            SUPABASE SYSTEM OBSERVABILITY MONITOR AND SYSTEM SPACE CLEANUP MANAGEMENT.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase text-slate-400">
            Last Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 disabled:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200/50 shadow-sm transition-all"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Warning Banners */}
      {getAlertBanners()}

      {/* KPI Observability Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* DB Size */}
        <StatCard
          title="Database Size"
          value={formatBytes(metrics.overview.dbSize)}
          icon={<Database className="h-4 w-4 text-primary" />}
          description={`Quota: 500 MB (${formatPercent(metrics.overview.dbSize, 524288000)} used)`}
        />
        {/* Storage Size */}
        <StatCard
          title="Storage Size"
          value={formatBytes(metrics.overview.storageSize)}
          icon={<HardDrive className="h-4 w-4 text-emerald-600" />}
          description={`Quota: 1 GB (${formatPercent(metrics.overview.storageSize, 1073741824)} used)`}
        />
        {/* MAU */}
        <StatCard
          title="Active Users (30d)"
          value={metrics.overview.mau}
          icon={<Users className="h-4 w-4 text-amber-500" />}
          description={`Quota: 50,000 MAU (${formatPercent(metrics.overview.mau, 50000)} used)`}
        />
        {/* Active DB Connections */}
        <StatCard
          title="Active Connections"
          value={`${metrics.overview.dbConnections}/${metrics.overview.dbMaxConnections}`}
          icon={<Activity className="h-4 w-4 text-indigo-500" />}
          description="Direct Postgres connections"
        />
      </div>

      {/* Auxiliary Quota Metrics Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-800 block">Supabase Quota Compliance</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Free plan usage limits alignment</span>
          </div>
          <Layers className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Quotas Column */}
            <div className="space-y-4">
              {/* Database size progress */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Database Size</span>
                  <span className={getStatusTextAndColor(metrics.usage.database.used, metrics.usage.database.limit).color}>
                    {formatBytes(metrics.usage.database.used)} / 500 MB ({formatPercent(metrics.usage.database.used, metrics.usage.database.limit)})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${getPercentValue(metrics.usage.database.used, metrics.usage.database.limit)}%` }}
                  />
                </div>
              </div>

              {/* Storage size progress */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Storage Size</span>
                  <span className={getStatusTextAndColor(metrics.usage.storage.used, metrics.usage.storage.limit).color}>
                    {formatBytes(metrics.usage.storage.used)} / 1 GB ({formatPercent(metrics.usage.storage.used, metrics.usage.storage.limit)})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${getPercentValue(metrics.usage.storage.used, metrics.usage.storage.limit)}%` }}
                  />
                </div>
              </div>

              {/* Monthly Active Users progress */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Active Users (30d sign-ins)</span>
                  <span className={getStatusTextAndColor(metrics.usage.mau.used, metrics.usage.mau.limit).color}>
                    {metrics.usage.mau.used.toLocaleString()} / 50,000 MAU Limit ({formatPercent(metrics.usage.mau.used, metrics.usage.mau.limit)})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500" 
                    style={{ width: `${getPercentValue(metrics.usage.mau.used, metrics.usage.mau.limit)}%` }}
                  />
                </div>
              </div>

              {/* Egress */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Egress (Bandwidth)</span>
                  <span className="text-slate-400 font-bold uppercase">Unavailable</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            {/* Right Quotas Column */}
            <div className="space-y-4">
              {/* Cached Egress */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Cached Egress</span>
                  <span className="text-slate-400 font-bold uppercase">Unavailable</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200" style={{ width: '0%' }} />
                </div>
              </div>

              {/* Realtime concurrent connections */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Realtime Connections</span>
                  <span className="text-slate-400 font-bold uppercase">Unavailable</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200" style={{ width: '0%' }} />
                </div>
              </div>

              {/* Realtime messages */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Realtime Messages</span>
                  <span className="text-slate-400 font-bold uppercase">Unavailable</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200" style={{ width: '0%' }} />
                </div>
              </div>

              {/* Edge Function Invocations */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>Edge Function Invocations</span>
                  <span className="text-slate-400 font-bold uppercase">Unavailable</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
            
          </div>
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex gap-2.5 items-start">
            <Info className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
            <span className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              Egress, Realtime Metrics, and Edge Function statistics are managed externally via Supabase's telemetry plane. Accessing these metrics requires client secrets or Management API keys which are omitted to safeguard system credentials. Active Users (30d sign-ins) is a database-level approximation based on auth.users last login activity.
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Database Usage Details (Tables size) */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-800 block">Database Relation Summary</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Key tables space usage contribution</span>
          </div>
          <button
            onClick={() => handleSortDb(dbSortBy === 'size' ? 'rows' : 'size')}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-secondary hover:text-secondary-dark transition-colors"
          >
            <span>Sort by {dbSortBy === 'size' ? 'Row Count' : 'Table Size'}</span>
            <ArrowDownUp className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150">
                <th className="px-5 py-3">Table Name</th>
                <th className="px-5 py-3 text-right">Rows</th>
                <th className="px-5 py-3 text-right">Disk Size</th>
                <th className="px-5 py-3 text-right">Percentage</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {getSortedTables(metrics.database.tables).map((tbl) => {
                const pct = (tbl.size / metrics.overview.dbSize) * 100;
                const tblStatus = getStatusFromPercentage((tbl.size / 524288000) * 100);
                return (
                  <tr key={`${tbl.schema}.${tbl.name}`} className="hover:bg-slate-50/30 transition-colors font-semibold">
                    <td className="px-5 py-3.5 text-slate-800 font-bold">
                      <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider block leading-none mb-0.5">{tbl.schema}</span>
                      {tbl.name}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-600">{tbl.rows.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-650">{formatBytes(tbl.size)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-450">{pct.toFixed(2)}%</td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(tblStatus)} className="text-[8px]">
                        {tblStatus}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Storage Monitoring buckets */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
          <span className="text-xs font-black uppercase text-slate-800">Storage Buckets Monitoring</span>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {metrics.storage.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No storage buckets found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150">
                  <th className="px-5 py-3">Bucket Name</th>
                  <th className="px-5 py-3 text-center">Type</th>
                  <th className="px-5 py-3 text-right">Objects</th>
                  <th className="px-5 py-3 text-right">Space Size</th>
                  <th className="px-5 py-3 text-center">Max File Size</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.storage.map((bucket) => {
                  const pct = (bucket.size / 1073741824) * 100;
                  const bucketStatus = getStatusFromPercentage(pct);
                  return (
                    <tr key={bucket.name} className="hover:bg-slate-50/30 transition-colors font-semibold">
                      <td className="px-5 py-3.5 text-slate-800 font-bold">{bucket.name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none border ${bucket.public ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {bucket.public ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-650">{bucket.objectCount}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600">{formatBytes(bucket.size)}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-450">
                        {bucket.fileSizeLimit ? formatBytes(bucket.fileSizeLimit) : 'No Limit'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={getStatusBadgeVariant(bucketStatus)} className="text-[8px]">
                          {bucketStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Storage Cleanup Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-800 block">Storage Cleanup Audit</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Detect and delete unreferenced/orphaned files</span>
          </div>
          <button
            onClick={handleScanCleanup}
            disabled={scanningCleanup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200"
          >
            <Compass className={`h-3.5 w-3.5 ${scanningCleanup ? 'animate-spin' : ''}`} />
            <span>Review Cleanup</span>
          </button>
        </CardHeader>
        <CardBody className="p-0">
          {!cleanupScanDone ? (
            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              Click "Review Cleanup" to scan files and database records.
            </div>
          ) : cleanupItems.length === 0 ? (
            <div className="p-8 text-center text-emerald-600 text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              <span>Storage status is healthy. No orphaned or unreferenced items detected.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="p-3 bg-amber-50 border-b border-slate-100 text-[10px] text-amber-800 font-bold uppercase flex justify-between items-center px-5">
                <span>Detected {cleanupItems.length} orphaned/unreferenced records/files</span>
                {selectedCleanupIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-black tracking-wider transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete Selected ({selectedCleanupIds.length})</span>
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedCleanupIds.length === cleanupItems.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCleanupIds(cleanupItems.map(i => i.id));
                          } else {
                            setSelectedCleanupIds([]);
                          }
                        }}
                        className="rounded border-slate-350 focus:ring-secondary text-secondary"
                      />
                    </th>
                    <th className="px-5 py-3">File / Record</th>
                    <th className="px-5 py-3 text-center">Bucket</th>
                    <th className="px-5 py-3 text-right">Size</th>
                    <th className="px-5 py-3 text-center">Created</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {cleanupItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedCleanupIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCleanupIds(prev => [...prev, item.id]);
                            } else {
                              setSelectedCleanupIds(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-slate-350 focus:ring-secondary text-secondary"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 max-w-[200px] truncate" title={item.file_name}>
                        {item.file_name}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-500 font-mono text-[10px]">{item.bucket}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-650">{formatBytes(item.size_bytes)}</td>
                      <td className="px-5 py-3.5 text-center text-slate-450 font-mono text-[10px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-amber-700 text-[11px] leading-relaxed max-w-[250px] font-bold">
                        {item.reason}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Advanced Telemetry Panel & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
            <span className="text-xs font-black uppercase text-slate-800">System Health Panel</span>
          </CardHeader>
          <CardBody className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Health checks */}
              <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-700">
                <span className="flex items-center gap-1.5"><Server className="h-4 w-4 text-slate-400" /> Supabase API</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${getHealthDotColor(metrics.systemHealth.supabaseApi)}`} />
                  {metrics.systemHealth.supabaseApi}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-700">
                <span className="flex items-center gap-1.5"><Database className="h-4 w-4 text-slate-400" /> Database</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${getHealthDotColor(metrics.systemHealth.database)}`} />
                  {metrics.systemHealth.database}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-700">
                <span className="flex items-center gap-1.5"><FileCode className="h-4 w-4 text-slate-400" /> Authentication</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${getHealthDotColor(metrics.systemHealth.authentication)}`} />
                  {metrics.systemHealth.authentication}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-700">
                <span className="flex items-center gap-1.5"><HardDrive className="h-4 w-4 text-slate-400" /> Storage</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${getHealthDotColor(metrics.systemHealth.storage)}`} />
                  {metrics.systemHealth.storage}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-700">
                <span className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-slate-400" /> Realtime API</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${getHealthDotColor(metrics.systemHealth.realtime)}`} />
                  {metrics.systemHealth.realtime}
                </span>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Health check ran at: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </div>
          </CardBody>
        </Card>

        {/* Telemetry charts panel (Unavailable Mocked/Stated) */}
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm flex flex-col h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">Host Telemetry (CPU / Memory / Disk)</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Host server load charts and resources</span>
            </div>
            <div className="flex gap-1 text-[8px] font-black uppercase border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <span className="px-2 py-0.5 rounded bg-white text-slate-800 shadow-sm">1h</span>
              <span className="px-2 py-0.5 text-slate-400">6h</span>
              <span className="px-2 py-0.5 text-slate-400">24h</span>
              <span className="px-2 py-0.5 text-slate-400">7d</span>
            </div>
          </CardHeader>
          <CardBody className="p-6 flex-1 flex flex-col justify-center items-center text-center">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl max-w-md space-y-2">
              <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Telemetry Unavailable</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Host environment resource usage (CPU/Memory/Disk IOPS) and network egress statistics require a dedicated Supabase Telemetry API proxy or Management API client credentials. These are disabled in accordance with the dashboard security boundary.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Audit Log Stream */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-800 block">Monitoring Audit Stream</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Action logging trail for observatory tasks</span>
          </div>
          <History className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody className="p-0">
          {loadingLogs ? (
            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Loading audit feed...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No monitoring actions recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex justify-between items-start gap-4 font-semibold text-slate-700">
                  <div className="flex gap-2">
                    <Badge variant={log.success ? 'success' : 'error'} className="text-[8px] py-0.5 px-1.5">
                      {log.success ? 'Success' : 'Failure'}
                    </Badge>
                    <div>
                      <span>{log.action} on <strong className="text-slate-800">{log.resource}</strong></span>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        Triggered by {log.actor?.full_name || 'Super Admin'} (ID: {log.actor_id.substring(0, 8)}...)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      {confirmDeleteModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-650">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Confirm Destructive Action
              </h3>
            </div>
            
            <div className="text-xs text-slate-650 leading-relaxed font-semibold space-y-2">
              <p>
                You are about to permanently delete the following target(s) from the system:
              </p>
              {confirmDeleteModal.bulk ? (
                <ul className="list-disc pl-5 font-mono text-[10px] max-h-32 overflow-y-auto">
                  {cleanupItems
                    .filter(i => selectedCleanupIds.includes(i.id))
                    .map(i => <li key={i.id}>{i.file_name} ({i.bucket})</li>)}
                </ul>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl font-mono text-[10px]">
                  <strong>Name:</strong> {confirmDeleteModal.item?.file_name}<br />
                  <strong>Bucket:</strong> {confirmDeleteModal.item?.bucket}<br />
                  <strong>Type:</strong> {confirmDeleteModal.item?.item_type}
                </div>
              )}
              <p className="font-bold text-red-600">
                WARNING: This deletion cannot be undone. Data/files will be deleted permanently.
              </p>
              <p className="pt-2 text-slate-500">
                Please type <strong className="text-slate-800">DELETE</strong> below to authorize:
              </p>
            </div>

            <input
              type="text"
              value={confirmDeleteModal.confirmText}
              onChange={(e) => {
                const text = e.target.value;
                setConfirmDeleteModal(prev => ({ ...prev, confirmText: text }));
              }}
              placeholder="Type DELETE"
              className="w-full text-center border-slate-200/80 rounded-xl text-xs font-bold uppercase tracking-wider focus:border-red-500 focus:ring-red-500 focus:ring-1"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(prev => ({ ...prev, open: false }))}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeletion}
                disabled={confirmDeleteModal.confirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-650 hover:bg-red-700 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-bold uppercase rounded-xl transition-all shadow-md active:scale-98"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DatabaseSystem;
