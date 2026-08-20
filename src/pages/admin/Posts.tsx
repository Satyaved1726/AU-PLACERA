import React, { useState } from 'react';
import { useAdminPosts } from '../../features/posts/hooks/useAdminPosts';
import { useUpdatePost } from '../../features/posts/hooks/useUpdatePost';
import { useDeletePost } from '../../features/posts/hooks/useDeletePost';
import { AdminPostCard } from '../../features/posts/components/AdminPostCard';
import { DeletePostDialog } from '../../features/posts/components/DeletePostDialog';
import type { Post, PostType } from '../../types';
import { 
  X, Star, CheckCircle2, AlertCircle, 
  Search, Filter, ClipboardList 
} from 'lucide-react';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { RegistrationListDialog } from '../../features/registrations/components/RegistrationListDialog';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { motion, AnimatePresence } from 'framer-motion';
import noticeBoardManagerIllustration from '../../assets/notice_board_manager_illustration.jpg';

export const Posts: React.FC = () => {
  const { data: posts, isLoading, error } = useAdminPosts();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'opportunity' | 'announcement' | 'archived'>('all');

  // Edit Modal state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCompany, setEditCompany] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<PostType>('opportunity');
  const [editPriority, setEditPriority] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editAudience, setEditAudience] = useState<'general' | 'oia'>('general');

  // Delete modal state
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Registrations dialog state
  const [viewingRegistrationsPost, setViewingRegistrationsPost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run updates
  const handleTogglePriority = async (id: string, currentVal: boolean) => {
    try {
      await updatePostMutation.mutateAsync({
        id,
        updates: { is_top_priority: !currentVal }
      });
      triggerToast(!currentVal ? 'Post marked as Top Priority.' : 'Priority removed.');
    } catch {
      triggerToast('Failed to update priority.');
    }
  };

  const handleToggleArchive = async (id: string, currentVal: boolean) => {
    try {
      await updatePostMutation.mutateAsync({
        id,
        updates: { is_active: !currentVal }
      });
      triggerToast(!currentVal ? 'Post restored successfully.' : 'Post archived.');
    } catch {
      triggerToast('Failed to update active state.');
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (post: Post) => {
    setEditingPost(post);
    setEditCompany(post.company_name || '');
    setEditTitle(post.opportunity_title || '');
    setEditContent(post.original_content);
    setEditType(post.post_type);
    setEditPriority(post.is_top_priority);
    setEditActive(post.is_active);
    setEditAudience(post.audience || 'general');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    try {
      await updatePostMutation.mutateAsync({
        id: editingPost.id,
        updates: {
          company_name: editType === 'opportunity' ? (editCompany || null) : null,
          opportunity_title: editTitle || null,
          original_content: editContent,
          post_type: editType,
          is_top_priority: editPriority,
          is_active: editActive,
          audience: editAudience
        }
      });
      setEditingPost(null);
      triggerToast('Post updated successfully.');
    } catch {
      triggerToast('Failed to update notice.');
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingPostId) return;

    try {
      await deletePostMutation.mutateAsync(deletingPostId);
      setDeletingPostId(null);
      triggerToast('Post deleted permanently.');
    } catch {
      triggerToast('Failed to delete notice.');
    }
  };

  // Apply filters
  const filteredPosts = (posts || []).filter(post => {
    const textMatch = (
      (post.company_name || '') + ' ' + 
      (post.opportunity_title || '') + ' ' + 
      post.original_content
    ).toLowerCase().includes(searchQuery.toLowerCase());

    if (!textMatch) return false;

    if (typeFilter === 'all') return true;
    if (typeFilter === 'archived') return !post.is_active;
    
    // Default: only show active items for specific types
    return post.post_type === typeFilter && post.is_active;
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-16 select-none px-4 sm:px-0">
      
      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5"
          >
            <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner Section */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>Notice Board Manager</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            Modify details, toggle priority status, and archive placement opportunities.
          </p>
        </div>
        
        <div className="relative shrink-0 select-none pointer-events-none">
          <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <img 
            src={noticeBoardManagerIllustration} 
            alt="Megaphone Speaker 3D Illustration" 
            className="h-20 w-20 sm:h-24 sm:w-24 object-contain relative z-10 rounded-2xl"
          />
        </div>
      </div>

      {/* Controls Card: Search & Horizontal Pill Tabs */}
      <div className="bg-white border border-slate-150 rounded-3xl p-4.5 shadow-sm space-y-4">
        {/* Search bar inside styled box */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-1.5 flex items-center gap-3 focus-within:border-secondary focus-within:bg-white transition-all shadow-sm">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities, notice, or keywords..."
            className="w-full bg-transparent focus:outline-none text-xs font-semibold text-slate-800 h-8"
          />
          <Filter className="h-4 w-4 text-slate-450 shrink-0" />
        </div>

        {/* Tab row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none select-none">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-4.5 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
              typeFilter === 'all' 
                ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('opportunity')}
            className={`px-4.5 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
              typeFilter === 'opportunity' 
                ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Opportunities
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('announcement')}
            className={`px-4.5 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
              typeFilter === 'announcement' 
                ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Announcements
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('archived')}
            className={`px-4.5 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
              typeFilter === 'archived' 
                ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>Failed to load notices. Please check connection and try again.</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredPosts.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No notices found</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Try adjusting filters or search query parameters.
          </p>
        </div>
      )}

      {/* SKELETON LOADER */}
      {isLoading && <PostSkeleton />}

      {/* CARDS LISTING GRID */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map(post => (
            <AdminPostCard
              key={post.id}
              post={post}
              onEdit={handleOpenEdit}
              onDelete={setDeletingPostId}
              onTogglePriority={handleTogglePriority}
              onToggleArchive={handleToggleArchive}
              onViewRegistrations={setViewingRegistrationsPost}
              onViewDetails={setSelectedPost}
            />
          ))}
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPost(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Content card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full md:max-w-xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 flex flex-col max-h-[85vh] md:max-h-[90vh] pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-0"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Edit Notice details</h3>
                <button
                  onClick={() => setEditingPost(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-650 h-9 w-9 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                
                {/* Type switcher */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                      Post Type
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditType('opportunity')}
                        className={`flex-1 py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                          editType === 'opportunity' 
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/5' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Opportunity
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('announcement')}
                        className={`flex-1 py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                          editType === 'announcement' 
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/5' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Notice
                      </button>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                      Priority Toggle
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditPriority(!editPriority)}
                      className={`w-full py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                        editPriority 
                          ? 'bg-amber-50 border-amber-250 text-amber-700 shadow-sm shadow-amber-600/5' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <Star className={`h-3 w-3 ${editPriority ? 'fill-current text-amber-500' : 'text-slate-400'}`} />
                      <span>{editPriority ? 'Priority' : 'Normal'}</span>
                    </button>
                  </div>
                </div>

                {/* Company & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editType === 'opportunity' && (
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        placeholder="e.g. BNP Paribas"
                        className="au-input"
                      />
                    </div>
                  )}

                  <div className={editType === 'opportunity' ? '' : 'col-span-2'}>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                      Opportunity / Notice Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. PRISM Internship / Roster updates"
                      className="au-input"
                    />
                  </div>
                </div>

                {/* Original content */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    Notice Description text
                  </label>
                  <textarea
                    rows={6}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter copy details..."
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/5 text-xs font-mono leading-relaxed transition-all"
                  />
                </div>

                {/* Audience visibility section */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                    Audience / Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setEditAudience('general')}
                      className={`py-2.5 px-4 border rounded-xl text-left transition-all ${
                        editAudience === 'general'
                          ? 'border-primary bg-primary/5 text-slate-800 ring-2 ring-primary/10'
                          : 'border-slate-200 bg-white text-slate-550 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block">All Students</span>
                      <span className="text-[8px] font-semibold text-slate-400 block mt-0.5 leading-none">Visible to all eligible students</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAudience('oia')}
                      className={`py-2.5 px-4 border rounded-xl text-left transition-all ${
                        editAudience === 'oia'
                          ? 'border-purple-600 bg-purple-50/10 text-slate-850 ring-2 ring-purple-600/10'
                          : 'border-slate-200 bg-white text-slate-550 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block text-purple-700">OIA Students Only</span>
                      <span className="text-[8px] font-semibold text-slate-400 block mt-0.5 leading-none">Only OIA-approved students can view</span>
                    </button>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Show Live to Students
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Dialog Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="h-10 px-5 text-[10px] font-black uppercase tracking-wider text-slate-555 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePostMutation.isPending}
                    className="h-10 px-6 rounded-xl bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white text-[10px] font-black uppercase tracking-wider transition-all select-none active:scale-[0.98]"
                  >
                    Save Changes
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <DeletePostDialog
        isOpen={deletingPostId !== null}
        onClose={() => setDeletingPostId(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deletePostMutation.isPending}
      />

      {/* REGISTRATIONS VIEWER DIALOG */}
      <RegistrationListDialog
        post={viewingRegistrationsPost}
        isOpen={viewingRegistrationsPost !== null}
        onClose={() => setViewingRegistrationsPost(null)}
      />

      {/* POST DETAIL VIEW DRAWER */}
      <PostDetail
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

    </div>
  );
};

export default Posts;
