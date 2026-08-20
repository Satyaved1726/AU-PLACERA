import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/useAuth';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Shield, ChevronLeft, Mail, Hash, Calendar, CheckCircle2, AlertCircle, Ban, Check, UserMinus, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  role: string;
  status: 'active' | 'suspended';
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  target_admin_id: string;
  action: 'ADMIN_CREATED' | 'ADMIN_ACTIVATED' | 'ADMIN_DEACTIVATED' | 'ADMIN_ROLE_CHANGED' | 'ADMIN_DELETED';
  metadata: any;
  created_at: string;
  actor?: { full_name: string };
}

interface AdminPost {
  id: string;
  original_content: string;
  post_type: 'opportunity' | 'announcement' | 'oia';
  company_name?: string;
  opportunity_title?: string;
  is_top_priority: boolean;
  created_at: string;
  is_active: boolean;
}

export const AdminDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal confirmation states
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'activate' | 'deactivate' | 'demote' | 'delete';
  }>({ open: false, type: 'deactivate' });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAdminDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // 1. Fetch profile metadata
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError || !profileData) {
        triggerToast('Failed to load coordinator profile.');
        navigate('/super-admin/admins');
        return;
      }

      setAdmin(profileData as AdminProfile);

      // 2. Fetch specific logs
      const { data: logsData } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          actor:profiles!actor_id(full_name)
        `)
        .eq('target_admin_id', id)
        .order('created_at', { ascending: false });

      if (logsData) {
        setLogs(logsData as any[]);
      }

      // 3. Fetch posts created by this admin
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('created_by', id)
        .order('created_at', { ascending: false });

      if (postsData) {
        setAdminPosts(postsData as AdminPost[]);
      }
    } catch (err) {
      console.error('[SUPER_ADMIN] Error fetching coordinator detail details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, [id]);

  const handleExecuteAction = async () => {
    if (!admin) return;
    const { type } = confirmModal;
    try {
      let error = null;

      if (type === 'activate') {
        const { error: err } = await supabase.rpc('update_admin_status', {
          target_id: admin.id,
          new_status: 'active'
        });
        error = err;
        if (!error) triggerToast(`Administrator ${admin.full_name} has been activated.`);
      } else if (type === 'deactivate') {
        const { error: err } = await supabase.rpc('update_admin_status', {
          target_id: admin.id,
          new_status: 'suspended'
        });
        error = err;
        if (!error) triggerToast(`Administrator ${admin.full_name} has been deactivated.`);
      } else if (type === 'demote') {
        const { error: err } = await supabase.rpc('remove_admin_privilege', {
          target_id: admin.id
        });
        error = err;
        if (!error) {
          triggerToast(`Admin privileges revoked. Role changed to Student.`);
          navigate('/super-admin/admins');
          return;
        }
      } else if (type === 'delete') {
        const { error: err } = await supabase.rpc('delete_admin_user', {
          target_id: admin.id
        });
        error = err;
        if (!error) {
          triggerToast(`Account for ${admin.full_name} deleted successfully.`);
          navigate('/super-admin/admins');
          return;
        }
      }

      if (error) {
        triggerToast(`Action failed: ${error.message}`);
      } else {
        fetchAdminDetails();
      }
    } catch (err: any) {
      triggerToast(`Operation failed: ${err.message || 'Connection error.'}`);
    } finally {
      setConfirmModal({ open: false, type: 'deactivate' });
    }
  };

  const renderActionText = (log: AuditLog) => {
    const actorName = log.actor?.full_name || 'System';
    switch (log.action) {
      case 'ADMIN_CREATED':
        return (
          <span>
            Created by <strong>{actorName}</strong>
          </span>
        );
      case 'ADMIN_ACTIVATED':
        return (
          <span>
            Activated by <strong>{actorName}</strong>
          </span>
        );
      case 'ADMIN_DEACTIVATED':
        return (
          <span>
            Deactivated by <strong>{actorName}</strong>
          </span>
        );
      case 'ADMIN_ROLE_CHANGED':
        return (
          <span>
            Role changed to student by <strong>{actorName}</strong>
          </span>
        );
      default:
        return <span>Action recorded.</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) return null;

  const isSelf = admin.id === currentProfile?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5"
          >
            <CheckCircle2 className="h-4.5 w-4.5 text-[#D9B310] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => navigate('/super-admin/admins')}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
            Coordinator Details
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Overview sheet and audit log trails.
          </p>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info & Meta Card */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs font-black uppercase text-slate-800">Profile Information</span>
              </div>
              <Badge variant={admin.status === 'active' ? 'success' : 'error'}>
                {admin.status}
              </Badge>
            </CardHeader>
            <CardBody className="p-6 space-y-5 text-xs text-slate-600 font-bold uppercase tracking-wider">
              
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                  {admin.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 normal-case leading-tight">
                    {admin.full_name}
                  </h2>
                  <span className="text-[9px] text-slate-400 block mt-1 tracking-widest uppercase">
                    Role: {admin.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400">Email Address</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-extrabold normal-case select-text">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{admin.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400">Employee ID</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-extrabold select-text">
                    <Hash className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{admin.roll_number || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400">Department</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-extrabold">
                    <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>AIML Department</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400">Created Date</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-extrabold">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{new Date(admin.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Activity Logs for coordinator */}
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800">History Trails</h3>
            </CardHeader>
            <CardBody className="p-0">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                  <Clock className="h-7 w-7 opacity-40 mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">No history trails found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="flex justify-between items-start gap-4 p-4.5">
                      <div className="flex gap-2.5">
                        <Badge 
                          variant={
                            log.action === 'ADMIN_CREATED' ? 'primary' :
                            log.action === 'ADMIN_ACTIVATED' ? 'success' :
                            log.action === 'ADMIN_DEACTIVATED' ? 'error' : 'warning'
                          }
                          className="text-[8px] tracking-widest uppercase font-bold py-0.5 px-1.5 shrink-0"
                        >
                          {log.action.replace('ADMIN_', '')}
                        </Badge>
                        <span className="text-slate-600 font-semibold leading-relaxed">
                          {renderActionText(log)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0 mt-0.5">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Placement Notices Created by Coordinator */}
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs font-black uppercase text-slate-800">Placement Notices Created</span>
              </div>
              <Badge variant="neutral">{adminPosts.length} Notices</Badge>
            </CardHeader>
            <CardBody className="p-0">
              {adminPosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                  <Clock className="h-7 w-7 opacity-40 mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">No notices created by this coordinator.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                  {adminPosts.map((post) => (
                    <div key={post.id} className="p-4.5 space-y-2 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            variant={
                              post.post_type === 'opportunity' ? 'primary' :
                              post.post_type === 'oia' ? 'warning' : 'neutral'
                            }
                            className="text-[8px] tracking-widest uppercase font-bold py-0.5 px-1.5"
                          >
                            {post.post_type}
                          </Badge>
                          {post.is_top_priority && (
                            <Badge variant="warning" className="text-[8px] py-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-250">
                              Priority
                            </Badge>
                          )}
                          {!post.is_active && (
                            <Badge variant="neutral" className="text-[8px] py-0.5 px-1.5 bg-slate-100 text-slate-600 border-slate-200">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold font-sans">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 normal-case">
                        {post.company_name ? `${post.company_name} - ` : ''}{post.opportunity_title || 'Notice'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono line-clamp-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 whitespace-pre-wrap leading-relaxed">
                        {post.original_content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Security Actions Card */}
        <div className="space-y-6">
          <Card className="border border-red-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-red-50/30 border-b border-red-50 px-5 py-4 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-red-600" />
              <span className="text-xs font-black uppercase text-red-800">Security Control</span>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              {isSelf ? (
                <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-center font-bold text-[10px] uppercase tracking-wider">
                  Self administration protections are active.
                </div>
              ) : (
                <>
                  {admin.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ open: true, type: 'deactivate' })}
                      className="w-full h-10 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Ban className="h-4 w-4" />
                      <span>Deactivate coordinator</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ open: true, type: 'activate' })}
                      className="w-full h-10 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Check className="h-4 w-4" />
                      <span>Activate coordinator</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'demote' })}
                    className="w-full h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none"
                  >
                    <UserMinus className="h-4 w-4" />
                    <span>Demote to Student</span>
                  </button>

                  <div className="border-t border-red-50 pt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ open: true, type: 'delete' })}
                      className="w-full h-10 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none animate-pulse"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

      </div>

      {/* Confirmation Actions dialog */}
      <AnimatePresence>
        {confirmModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden z-10 border border-slate-100"
            >
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className={`p-2.5 rounded-full inline-block shrink-0 ${
                    confirmModal.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800">
                      {confirmModal.type === 'activate' && 'Activate Administrator?'}
                      {confirmModal.type === 'deactivate' && 'Deactivate Administrator?'}
                      {confirmModal.type === 'demote' && 'Remove Admin Access?'}
                      {confirmModal.type === 'delete' && 'Delete Admin Account?'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                      {confirmModal.type === 'activate' && `Are you sure you want to enable access permissions for ${admin.full_name}?`}
                      {confirmModal.type === 'deactivate' && `This administrator (${admin.full_name}) will no longer be able to access coordinator features.`}
                      {confirmModal.type === 'demote' && `This will change ${admin.full_name}'s role to student. They will lose all coordinator privileges.`}
                      {confirmModal.type === 'delete' && `Warning: This will permanently delete the administrator account for ${admin.full_name}, but all existing placement posts, notices, and historical data created by this administrator will be preserved.`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] font-black uppercase tracking-wider">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteAction}
                    className={`px-3.5 py-2 text-white rounded-lg transition-all active:scale-95 ${
                      confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                      confirmModal.type === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700' :
                      confirmModal.type === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary-dark'
                    }`}
                  >
                    Confirm Action
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDetail;
