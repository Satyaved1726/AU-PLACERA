import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  useTeamMembers, useCreateTeamMember, useUpdateTeamMember, 
  useDeleteTeamMember, useToggleMemberActive, useUpdateDisplayOrder 
} from '../../features/team/hooks/useTeamMembers';
import type { TeamMember, TeamMemberCategory } from '../../types';
import { 
  UserPlus, Edit, Trash2, CheckCircle2, AlertCircle, 
  X, Image as ImageIcon, Loader2, Check, ArrowUp, ArrowDown 
} from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';

const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const TeamManagement: React.FC = () => {
  const { data: members = [], isLoading, error } = useTeamMembers();

  // Mutations
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();
  const toggleActiveMutation = useToggleMemberActive();
  const updateOrderMutation = useUpdateDisplayOrder();

  // Filter state
  const [activeTab, setActiveTab] = useState<TeamMemberCategory>('leadership');

  // Form modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  // Form input states
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<TeamMemberCategory>('leadership');
  const [leadershipRole, setLeadershipRole] = useState('HOD');
  const [ssraRole, setSsraRole] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // File states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Error/Success alerts
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFullName('');
    setCategory('leadership');
    setLeadershipRole('HOD');
    setSsraRole('');
    setDepartment('');
    setDescription('');
    setLinkedinUrl('');
    setGithubUrl('');
    setDisplayOrder('0');
    setIsActive(true);
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFullName(member.full_name);
    setCategory(member.category);
    if (member.category === 'leadership') {
      setLeadershipRole(member.designation);
    } else {
      setSsraRole(member.designation);
    }
    setDepartment(member.department || '');
    setDescription(member.description || '');
    setLinkedinUrl(member.linkedin_url || '');
    setGithubUrl(member.github_url || '');
    setDisplayOrder(String(member.display_order));
    setIsActive(member.is_active);
    setPhotoFile(null);
    setPhotoPreview(member.photo_path);
    setFormError(null);
    setFormOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setFormError('Photo file size must be under 3MB.');
      return;
    }

    // Validate type (JPG, JPEG, PNG, WEBP)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormError('Supported image formats: JPG, JPEG, PNG, WEBP.');
      return;
    }

    setFormError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFormError('Full Name is required.');
      return;
    }

    const designation = category === 'leadership' ? leadershipRole : ssraRole.trim();
    if (!designation) {
      setFormError('Designation/Role is required.');
      return;
    }

    if (!editingMember && !photoFile) {
      setFormError('Photo file is required for new team members.');
      return;
    }

    try {
      setUploadProgress(true);
      
      const payload = {
        fullName: trimmedName,
        designation,
        category,
        department: department.trim() || null,
        description: description.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        displayOrder: Number(displayOrder) || 0,
        isActive
      };

      if (editingMember) {
        await updateMutation.mutateAsync({
          id: editingMember.id,
          params: {
            ...payload,
            newPhotoFile: photoFile,
            oldPhotoUrl: editingMember.photo_path
          }
        });
        triggerToast('Team member updated successfully!');
      } else {
        await createMutation.mutateAsync({
          ...payload,
          photoFile: photoFile!
        });
        triggerToast('Team member added successfully!');
      }
      setFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the profile details.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      await deleteMutation.mutateAsync({
        id: deletingMember.id,
        photoUrl: deletingMember.photo_path
      });
      triggerToast('Team member deleted successfully!');
      setDeletingMember(null);
    } catch (err: any) {
      triggerToast('Failed to delete team member: ' + err.message);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: member.id,
        isActive: !member.is_active
      });
      triggerToast(member.is_active ? 'Member deactivated successfully.' : 'Member activated successfully!');
    } catch (err: any) {
      triggerToast('Failed to update active state.');
    }
  };

  const handleAdjustOrder = async (member: TeamMember, direction: 'up' | 'down') => {
    const change = direction === 'up' ? -1 : 1;
    const newOrder = Math.max(0, member.display_order + change);
    try {
      await updateOrderMutation.mutateAsync({
        id: member.id,
        displayOrder: newOrder
      });
    } catch (err: any) {
      triggerToast('Failed to adjust sort order.');
    }
  };

  // Filter members list based on tab
  const filteredList = members.filter(m => m.category === activeTab);

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-16 px-4 sm:px-0">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
            Team Management
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            Manage administrative profiles and developers visible in the public team section.
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="h-10 w-10 sm:h-11 sm:w-11 bg-[#0B3C5D] hover:bg-[#0B3C5D]/95 text-white rounded-2xl flex items-center justify-center transition-all select-none shrink-0 shadow-sm active:scale-95 cursor-pointer"
          title="Add Team Member"
        >
          <UserPlus className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs segment */}
      <div className="bg-white border border-slate-150 rounded-3xl p-2.5 flex gap-2 shadow-sm select-none">
        <button
          type="button"
          onClick={() => setActiveTab('leadership')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all ${
            activeTab === 'leadership'
              ? 'bg-[#F0F7FF] text-[#2563EB] border border-blue-100/50'
              : 'text-slate-450 hover:bg-slate-50'
          }`}
        >
          Leadership
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ssra')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all ${
            activeTab === 'ssra'
              ? 'bg-[#F0F7FF] text-[#2563EB] border border-blue-100/50'
              : 'text-slate-455 hover:bg-slate-50'
          }`}
        >
          SSRA Team
        </button>
      </div>

      {/* LOADING / ERRORFallback */}
      {isLoading ? (
        <PostSkeleton />
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl text-center">
          Failed to load team roster from Supabase.
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-150 rounded-3xl p-8 shadow-sm">
          <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No Profiles Found</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Click the "+" icon above to configure a team profile for this category.
          </p>
        </div>
      ) : (
        /* Team Members List Card */
        <div className="space-y-4">
          {filteredList.map(member => (
            <Card key={member.id} elevation={1} className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardBody className="p-4 flex items-center justify-between gap-4">
                
                {/* Image Avatar Preview */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-14 w-12 rounded-xl bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                    <img 
                      src={member.photo_path} 
                      alt={member.full_name} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-850 truncate max-w-[150px] sm:max-w-xs block leading-tight">
                        {member.full_name}
                      </span>
                      {member.is_active ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Active" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" title="Inactive" />
                      )}
                    </div>
                    
                    <p className="text-[9px] font-extrabold text-blue-650 uppercase tracking-wider truncate leading-tight mt-0.5">
                      {member.designation}
                    </p>
                    
                    {member.department && (
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide leading-none pt-0.5 truncate max-w-[150px]">
                        {member.department}
                      </p>
                    )}
                  </div>
                </div>

                {/* Operations Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {/* Reorder Up / Down */}
                  <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-200 p-0.5 rounded-lg mr-1 shrink-0">
                    <button
                      onClick={() => handleAdjustOrder(member, 'up')}
                      className="p-0.5 hover:bg-slate-200 text-slate-500 rounded transition-colors active:scale-90"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleAdjustOrder(member, 'down')}
                      className="p-0.5 hover:bg-slate-200 text-slate-500 rounded transition-colors active:scale-90"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-colors active:scale-95 ${
                      member.is_active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {member.is_active ? 'Active' : 'Muted'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors active:scale-90 shadow-sm"
                    title="Edit Profile"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeletingMember(member)}
                    className="p-2 border border-red-100 rounded-xl bg-red-50/20 hover:bg-red-50 text-red-500 hover:text-red-750 transition-colors active:scale-90 shadow-sm"
                    title="Delete Member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL DRAWER */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 select-none">
            {/* Backdrop */}
            <div 
              onClick={() => !uploadProgress && setFormOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-250 overflow-hidden relative z-10 flex flex-col max-h-[85vh] md:max-h-[90vh] pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-0">
              
              <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  {editingMember ? 'Edit Profile' : 'Add Team Member'}
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  disabled={uploadProgress}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-650 h-9 w-9 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Scroll Container */}
              <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4.5 scrollbar-none select-text">
                
                {formError && (
                  <div className="p-3.5 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Padmini"
                    className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800"
                  />
                </div>

                {/* Category Switcher */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5 mb-1.5">
                      Category *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory('leadership')}
                        className={`flex-1 py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          category === 'leadership'
                            ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Leadership
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory('ssra')}
                        className={`flex-1 py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          category === 'ssra'
                            ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        SSRA Team
                      </button>
                    </div>
                  </div>

                  {/* Display Order */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5 mb-1.5">
                      Display Order (Sort)
                    </label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full pl-3.5 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800 h-9.5"
                    />
                  </div>
                </div>

                {/* Role/Designation Selector */}
                {category === 'leadership' ? (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                      Designation Role *
                    </label>
                    <select
                      value={leadershipRole}
                      onChange={(e) => setLeadershipRole(e.target.value)}
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary font-semibold text-slate-850"
                    >
                      <option value="HOD">HOD (Head of Department)</option>
                      <option value="OIA Representative">OIA Representative</option>
                      <option value="Placement Coordinator">Placement Coordinator</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                      SSRA Role / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={ssraRole}
                      onChange={(e) => setSsraRole(e.target.value)}
                      placeholder="e.g. Student Lead Developer"
                      className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800"
                    />
                  </div>
                )}

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                    Department / Office
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. AIML Department"
                    className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800"
                  />
                </div>

                {/* Short Bio / Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                    Bio Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a brief professional introduction..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800 resize-none leading-relaxed"
                  />
                </div>

                {/* Social URL inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5 flex items-center gap-1">
                      <LinkedinIcon className="h-3 w-3 text-slate-400" />
                      <span>LinkedIn URL</span>
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full pl-3.5 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800 h-9.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5 flex items-center gap-1">
                      <GithubIcon className="h-3 w-3 text-slate-400" />
                      <span>GitHub URL</span>
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full pl-3.5 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800 h-9.5"
                    />
                  </div>
                </div>

                {/* Photograph Upload with Preview */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                    Portrait Photograph File *
                  </label>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <div className="h-20 w-16 bg-slate-100 rounded-xl overflow-hidden relative shrink-0 border border-slate-200 flex items-center justify-center text-slate-350">
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Uploaded Profile Preview" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="text-xs font-semibold text-slate-600 block file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-200 file:bg-white file:text-[9px] file:font-black file:uppercase file:text-slate-500 hover:file:bg-slate-50 cursor-pointer"
                      />
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block leading-relaxed">
                        Formats: JPG, PNG, WEBP. Max size: 3MB.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Switch */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 pt-3.5 select-none">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Publish Live on Placement Team Screen
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Submit Controls */}
                <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100 select-none">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    disabled={uploadProgress}
                    className="h-10 px-5 text-[10px] font-black uppercase tracking-wider text-slate-555 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadProgress}
                    className="h-10 px-6 rounded-xl bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white text-[10px] font-black uppercase tracking-wider transition-all select-none active:scale-[0.98] flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {uploadProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deletingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => !deleteMutation.isPending && setDeletingMember(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 relative z-10 text-center space-y-5 select-none animate-scale-up">
              
              <div className="space-y-2.5">
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-full inline-block text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Delete Profile?
                </h3>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-xs mx-auto">
                  Are you sure you want to remove <strong className="text-slate-600">{deletingMember.full_name}</strong>? This action will permanently remove the record and delete their photo from Supabase Storage.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 select-none">
                <button
                  onClick={() => setDeletingMember(null)}
                  disabled={deleteMutation.isPending}
                  className="py-2.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TeamManagement;
