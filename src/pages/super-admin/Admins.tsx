import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/useAuth';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Plus, Mail, Hash, Phone, User, CheckCircle2, AlertCircle, X, Ban, Check, UserMinus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  role: string;
  status: 'active' | 'suspended';
  branch?: string;
  designation?: string;
  phone?: string;
  created_at: string;
}

export const Admins: React.FC = () => {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();

  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'status'>('name');

  // Modal open states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states (Add Admin)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('AIML');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tempPasswordReveal, setTempPasswordReveal] = useState<string | null>(null);

  // Form states (Edit Admin)
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('AIML');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Global action confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'activate' | 'deactivate' | 'demote' | 'delete';
    adminId: string;
    adminName: string;
  }>({ open: false, type: 'deactivate', adminId: '', adminName: '' });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'super_admin'])
        .order('full_name', { ascending: true });

      if (!error && data) {
        setAdmins(data as AdminProfile[]);
      }
    } catch (err) {
      console.error('[SUPER_ADMIN] Error fetching admins roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Filter & Sort logic
  const filteredAndSortedAdmins = admins
    .filter(admin => {
      // 1. Status Filter
      if (statusFilter !== 'all' && admin.status !== statusFilter) {
        return false;
      }
      // 2. Department Filter
      if (departmentFilter !== 'all' && admin.branch !== departmentFilter) {
        return false;
      }
      // 3. Search query filter
      const text = (
        (admin.full_name || '') + ' ' +
        (admin.email || '') + ' ' +
        (admin.roll_number || '') + ' ' +
        (admin.branch || '')
      ).toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.full_name.localeCompare(b.full_name);
      }
      if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  // Extract unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set(admins.map(a => a.branch).filter(Boolean)));

  // Create Administrator
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setTempPasswordReveal(null);

    if (!fullName || !email || !employeeId || !password || !confirmPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);

      // Invoke DB RPC function to securely create coordinator
      const { error } = await supabase.rpc('create_admin_user', {
        admin_email: email.trim().toLowerCase(),
        admin_password: password,
        admin_full_name: fullName.trim(),
        admin_employee_id: employeeId.trim(),
        admin_department: department,
        admin_designation: designation.trim(),
        admin_phone: phone.trim()
      });

      if (error) {
        console.error('[SUPER_ADMIN] create_admin_user RPC failed:', error);
        if (error.message.includes('already exists') || error.message.includes('unique') || error.code === '23505') {
          setFormError('An administrator/account with this email already exists.');
        } else {
          setFormError(`Administrator creation failed: ${error.message || 'Unknown database error'}`);
        }
        return;
      }

      setTempPasswordReveal(password);
      triggerToast('Administrator created successfully.');
      fetchAdmins();
    } catch (err: any) {
      console.error('[SUPER_ADMIN] exception during create_admin_user:', err);
      if (err.message?.includes('already exists') || err.message?.includes('unique') || err.code === '23505') {
        setFormError('An administrator/account with this email already exists.');
      } else {
        setFormError(`Administrator creation failed: ${err.message || 'Connection error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeAddModal = () => {
    if (submitting) return;
    setIsAddModalOpen(false);
    setTempPasswordReveal(null);
    setFullName('');
    setEmail('');
    setEmployeeId('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
  };

  // Open Edit Modal
  const openEditModal = (admin: AdminProfile) => {
    setEditingAdmin(admin);
    setEditFullName(admin.full_name);
    setEditEmployeeId(admin.roll_number || '');
    setEditDepartment(admin.branch || 'AIML');
    setEditDesignation(admin.designation || '');
    setEditPhone(admin.phone || '');
    setEditFormError(null);
    setIsEditModalOpen(true);
  };

  // Save Administrator edits
  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditFormError(null);

    if (!editFullName || !editEmployeeId) {
      setEditFormError('Full name and Employee ID are required.');
      return;
    }

    try {
      setSubmitting(true);

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          roll_number: editEmployeeId.trim(),
          branch: editDepartment,
          designation: editDesignation.trim(),
          phone: editPhone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAdmin.id);

      if (updateErr) throw updateErr;

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        actor_id: currentProfile?.id,
        target_admin_id: editingAdmin.id,
        action: 'ADMIN_EDITED',
        metadata: {
          full_name: editFullName.trim(),
          department: editDepartment,
          designation: editDesignation.trim(),
          phone: editPhone.trim()
        }
      });

      triggerToast(`Account details for ${editFullName} updated successfully.`);
      setIsEditModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle activation status
  const handleConfirmAction = async () => {
    const { type, adminId, adminName } = confirmModal;
    setConfirmModal(prev => ({ ...prev, open: false }));

    try {
      let error = null;

      if (type === 'activate' || type === 'deactivate') {
        const nextStatus = type === 'activate' ? 'active' : 'suspended';
        const { error: err } = await supabase.rpc('update_admin_status', {
          target_id: adminId,
          new_status: nextStatus
        });
        error = err;
        if (!error) {
          triggerToast(`Access status for ${adminName} updated to ${nextStatus}.`);
        }
      } else if (type === 'demote') {
        const { error: err } = await supabase.rpc('remove_admin_privilege', {
          target_id: adminId
        });
        error = err;
        if (!error) {
          triggerToast(`Admin privileges revoked. Role changed to Student.`);
        }
      } else if (type === 'delete') {
        const { error: err } = await supabase.rpc('delete_admin_user', {
          target_id: adminId
        });
        error = err;
        if (!error) {
          triggerToast(`Coordinator account permanently deleted.`);
        }
      }

      if (error) {
        triggerToast(`Action failed: ${error.message}`);
      } else {
        fetchAdmins();
      }
    } catch (err: any) {
      triggerToast(`Operation failed: ${err.message || 'Connection error.'}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none px-4 sm:px-0">
      
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

      {/* Roster Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Administrators Directory</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Manage coordinators roster, configure access rights, and monitor status.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setTempPasswordReveal(null);
            setIsAddModalOpen(true);
          }}
          className="h-10 px-4.5 inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md shadow-primary/10 active:scale-95 transition-all select-none self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Administrator</span>
        </button>
      </div>

      {/* Roster Search & Filter Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
            {filteredAndSortedAdmins.length} Administrators Listed
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Status Filter */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 font-sans">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 font-sans">Department</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Sort By criteria */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 font-sans">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
            >
              <option value="name">Name</option>
              <option value="created">Date Created</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Cards (Mobile) & Table (Desktop) */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(idx => (
            <div key={idx} className="h-20 rounded-2xl bg-slate-200/60 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredAndSortedAdmins.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-350 rounded-2xl bg-slate-50/50">
          <User className="h-8 w-8 mx-auto opacity-50 mb-2" />
          <p className="text-xs font-bold uppercase tracking-wider">No matching coordinators found.</p>
        </div>
      ) : (
        <>
          {/* Mobile View Cards */}
          <div className="md:hidden space-y-4">
            {filteredAndSortedAdmins.map((admin) => {
              const isSelf = admin.id === currentProfile?.id;
              return (
                <div key={admin.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                        {admin.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{admin.full_name}</span>
                          {admin.role === 'super_admin' && (
                            <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              SUPER
                            </span>
                          )}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                          {admin.designation || 'Coordinator'} • {admin.branch}
                        </span>
                      </div>
                    </div>

                    <Badge variant={admin.status === 'active' ? 'success' : 'error'}>
                      {admin.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-550 font-bold uppercase tracking-wider select-text">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                    {admin.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{admin.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Emp ID: {admin.roll_number || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Actions Drawer */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 select-none">
                    <button
                      onClick={() => navigate(`/super-admin/admins/${admin.id}`)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase text-slate-700 tracking-wider rounded-lg active:scale-95 transition-all text-center"
                    >
                      Audit logs
                    </button>
                    {!isSelf && admin.role !== 'super_admin' && (
                      <>
                        <button
                          onClick={() => openEditModal(admin)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase text-slate-700 tracking-wider rounded-lg active:scale-95 transition-all"
                        >
                          Edit
                        </button>
                        {admin.status === 'active' ? (
                          <button
                            onClick={() => setConfirmModal({ open: true, type: 'deactivate', adminId: admin.id, adminName: admin.full_name })}
                            className="px-3 py-1.5 bg-red-50 border border-red-150 text-[10px] font-black uppercase text-red-600 tracking-wider rounded-lg active:scale-95 transition-all"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmModal({ open: true, type: 'activate', adminId: admin.id, adminName: admin.full_name })}
                            className="px-3 py-1.5 bg-green-50 border border-green-150 text-[10px] font-black uppercase text-green-600 tracking-wider rounded-lg active:scale-95 transition-all"
                          >
                            Activate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View Table */}
          <div className="hidden md:block overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4.5">Administrator</th>
                  <th className="px-6 py-4.5">Email</th>
                  <th className="px-6 py-4.5">Emp ID</th>
                  <th className="px-6 py-4.5 text-center">Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 select-text font-medium text-slate-700">
                {filteredAndSortedAdmins.map((admin) => {
                  const isSelf = admin.id === currentProfile?.id;
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {admin.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{admin.full_name}</span>
                              {admin.role === 'super_admin' && (
                                <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider select-none">
                                  SUPER ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
                              {admin.designation || 'Coordinator'} • {admin.branch}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 select-all font-bold text-slate-500">{admin.email}</td>
                      <td className="px-6 py-4.5 font-bold text-slate-500">{admin.roll_number || 'N/A'}</td>
                      <td className="px-6 py-4.5 text-center">
                        <Badge variant={admin.status === 'active' ? 'success' : 'error'}>
                          {admin.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4.5 text-right space-x-1.5 select-none">
                        <button
                          onClick={() => navigate(`/super-admin/admins/${admin.id}`)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 tracking-wider rounded-lg transition-all"
                        >
                          View Logs
                        </button>
                        {!isSelf && admin.role !== 'super_admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(admin)}
                              className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg inline-flex items-center transition-all align-middle"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {admin.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'deactivate', adminId: admin.id, adminName: admin.full_name })}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-[10px] font-black uppercase text-red-600 tracking-wider rounded-lg transition-all"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'activate', adminId: admin.id, adminName: admin.full_name })}
                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-100 text-[10px] font-black uppercase text-green-600 tracking-wider rounded-lg transition-all"
                              >
                                Activate
                              </button>
                            )}
                          </>
                        )}
                        {isSelf && (
                          <span className="text-[10px] text-slate-400 font-bold italic mr-2 select-none">Self Account</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Administrator Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeAddModal}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden z-10 border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">Create Administrator</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5 font-sans">
                    Register a new placement coordinator
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {tempPasswordReveal ? (
                <div className="p-6 space-y-6 text-center">
                  <div className="mx-auto h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Account Created Successfully</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Share these credentials with the coordinator to log in.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs text-left space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Email</span>
                        <span className="font-bold text-slate-800 select-all">{email}</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(email);
                          triggerToast('Email copied to clipboard.');
                        }}
                        className="h-7 px-3 text-[9px] font-black uppercase tracking-wider rounded-lg border bg-white shadow-sm shrink-0"
                      >
                        Copy Email
                      </Button>
                    </div>

                    <div className="border-t border-slate-200/60 my-2" />

                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1 mr-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Initial Password</span>
                        <span className="font-bold text-slate-850 truncate select-all block">
                          {showPassword ? tempPasswordReveal : '••••••••'}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-450 hover:text-slate-600 transition-colors shadow-sm"
                          title={showPassword ? 'Hide Password' : 'Show Password'}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(tempPasswordReveal || '');
                            triggerToast('Password copied to clipboard.');
                          }}
                          className="h-7 px-3 text-[9px] font-black uppercase tracking-wider rounded-lg border bg-white shadow-sm"
                        >
                          Copy Password
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={closeAddModal}
                    className="w-full h-10 rounded-xl font-black uppercase text-[10px] tracking-wider"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAddAdmin} className="p-5 space-y-4">
                  {formError && (
                    <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Dr. Haritha Prasad"
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Official Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. haritha.aiml@anurag.edu.in"
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Employee ID</label>
                        <input
                          type="text"
                          required
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          placeholder="e.g. EMP405"
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Department</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-850 font-bold uppercase"
                        >
                          <option value="AIML">AIML</option>
                          <option value="CSE">CSE</option>
                          <option value="IT">IT</option>
                          <option value="ECE">ECE</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Designation</label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="Assistant Professor"
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Phone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Confirm Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={submitting}
                    className="w-full h-10 rounded-xl mt-4 font-black uppercase text-[10px] tracking-wider"
                  >
                    Provision Coordinator
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Administrator Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden z-10 border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">Edit Profile details</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5 font-sans">
                    Modify profile parameters securely
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setIsEditModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditAdmin} className="p-5 space-y-4">
                {editFormError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{editFormError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-sans">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-sans">Employee ID</label>
                      <input
                        type="text"
                        required
                        value={editEmployeeId}
                        onChange={(e) => setEditEmployeeId(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-sans">Department</label>
                      <select
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-850 font-bold uppercase"
                      >
                        <option value="AIML">AIML</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-sans">Designation</label>
                      <input
                        type="text"
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-sans">Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'demote', adminId: editingAdmin.id, adminName: editingAdmin.full_name })}
                    className="h-10 px-4.5 border border-amber-250 text-amber-700 bg-amber-50 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-amber-100 active:scale-95 transition-all select-none"
                  >
                    <UserMinus className="h-4 w-4" />
                    <span>Demote</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'delete', adminId: editingAdmin.id, adminName: editingAdmin.full_name })}
                    className="h-10 px-4.5 border border-red-200 text-red-600 bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-100 active:scale-95 transition-all select-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                  
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={submitting}
                    className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Overlays */}
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
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden z-10 border border-slate-100"
            >
              <div className="p-6 text-center space-y-6">
                <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center border ${
                  confirmModal.type === 'delete' ? 'bg-red-50 border-red-100 text-red-600' :
                  confirmModal.type === 'demote' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                  confirmModal.type === 'deactivate' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-green-50 border-green-100 text-green-600'
                }`}>
                  {confirmModal.type === 'delete' ? <Trash2 className="h-6 w-6" /> :
                   confirmModal.type === 'demote' ? <UserMinus className="h-6 w-6" /> :
                   confirmModal.type === 'deactivate' ? <Ban className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase">
                    Confirm Action
                  </h3>
                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed uppercase tracking-wide">
                    {confirmModal.type === 'delete' && `Are you sure you want to permanently delete coordinator ${confirmModal.adminName}? The administrator account will be removed/deactivated, but all existing placement posts, notices, and historical data will be preserved.`}
                    {confirmModal.type === 'demote' && `Demote ${confirmModal.adminName} to student? They will retain placement eligibility, but lose all administrative features.`}
                    {confirmModal.type === 'deactivate' && `Suspend access for coordinator ${confirmModal.adminName}? They will be blocked from logging into the console.`}
                    {confirmModal.type === 'activate' && `Activate credentials access for coordinator ${confirmModal.adminName}?`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                    className="flex-1 h-10 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:scale-95 transition-all select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider text-white active:scale-95 transition-all select-none ${
                      confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                      confirmModal.type === 'demote' ? 'bg-amber-500 hover:bg-amber-600' :
                      confirmModal.type === 'deactivate' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
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

export default Admins;
