import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { supabase } from '../../lib/supabase';
import { Activity, ChevronLeft, ChevronRight, User, Terminal, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  metadata: any;
  actor: {
    full_name: string;
    email: string;
    role: string;
  };
}

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedActor, setSelectedActor] = useState('ALL');
  const [actorsList, setActorsList] = useState<{ id: string; name: string }[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const itemsPerPage = 8;

  // Load audit actors roster to populate filter
  const loadActors = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'super_admin']);
      if (data) {
        setActorsList(data.map(p => ({ id: p.id, name: p.full_name })));
      }
    } catch (err) {
      console.error('[ACTIVITY] Failed to load actors:', err);
    }
  };

  // Query paginated logs with filter sets
  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_activity_logs')
        .select(`
          id,
          created_at,
          action,
          metadata,
          actor:actor_id (
            full_name,
            email,
            role
          )
        `, { count: 'exact' });

      // Apply action filters
      if (actionFilter !== 'ALL') {
        query = query.eq('action', actionFilter);
      }

      // Apply actor filters
      if (selectedActor !== 'ALL') {
        query = query.eq('actor_id', selectedActor);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: false });

      // Apply pagination bounds
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setLogs(data as any || []);
      setTotalLogsCount(count || 0);
    } catch (err: any) {
      console.error('[ACTIVITY] Failed to query activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActors();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, selectedActor, currentPage]);

  const renderDescription = (log: AuditLog) => {
    const targetName = log.metadata?.full_name || log.metadata?.email || 'N/A';
    switch (log.action) {
      case 'ADMIN_CREATED':
        return `Provisioned coordinator account for ${targetName}`;
      case 'ADMIN_ACTIVATED':
        return `Activated coordinator account`;
      case 'ADMIN_DEACTIVATED':
        return `Suspended coordinator access`;
      case 'ADMIN_ROLE_CHANGED':
        return `Elevated or demoted coordinator permissions`;
      case 'ADMIN_DELETED':
        return `Permanently deleted coordinator ${targetName}`;
      default:
        return 'System setting modification event';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      log.actor?.full_name?.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      JSON.stringify(log.metadata).toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(totalLogsCount / itemsPerPage);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
            Platform Activity Logs
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            View immutable history logs of coordinator and administrative actions.
          </p>
        </div>
      </div>

      {/* Roster Search Bar & Category Filters */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <SearchBar
              onSearchChange={setSearchQuery}
              placeholder="Search actor name, action, or metadata..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Action Category */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <Terminal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none uppercase"
              >
                <option value="ALL">All Actions</option>
                <option value="ADMIN_CREATED">Created</option>
                <option value="ADMIN_ACTIVATED">Activated</option>
                <option value="ADMIN_DEACTIVATED">Suspended</option>
                <option value="ADMIN_ROLE_CHANGED">Role Changed</option>
                <option value="ADMIN_DELETED">Deleted</option>
              </select>
            </div>

            {/* Filter Actor Name */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedActor}
                onChange={(e) => {
                  setSelectedActor(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none max-w-[150px] uppercase"
              >
                <option value="ALL">All Actors</option>
                {actorsList.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Logs Table / mobile card block */}
      <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <HelpCircle className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wide">No activity logs recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div 
                    key={log.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            variant={
                              log.action === 'ADMIN_CREATED' ? 'primary' :
                              log.action === 'ADMIN_ACTIVATED' ? 'success' :
                              log.action === 'ADMIN_DEACTIVATED' ? 'error' :
                              log.action === 'ADMIN_ROLE_CHANGED' ? 'warning' : 'neutral'
                            }
                            className="text-[8px] font-black uppercase tracking-wider py-0.5 px-2"
                          >
                            {log.action.replace('ADMIN_', '')}
                          </Badge>
                          <span className="text-slate-400 font-bold text-[10px]">
                            Actor: {log.actor?.full_name || 'System'}
                          </span>
                        </div>
                        <div className="text-slate-700 font-semibold leading-relaxed">
                          {renderDescription(log)}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold shrink-0 self-end sm:self-center">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Metadata JSON Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50 border-t border-slate-100/50"
                        >
                          <div className="p-4 font-mono text-[10px] text-slate-650 bg-slate-100/50 rounded-lg m-4 border border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 select-none">
                              Event Payload
                            </span>
                            <pre className="overflow-x-auto select-text">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Page {currentPage} of {totalPages} ({totalLogsCount} total logs)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition-all text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition-all text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ActivityPage;
