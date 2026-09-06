import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminPolls } from '../../features/polls/hooks/usePolls';
import { useDeletePoll } from '../../features/polls/hooks/usePollMutations';
import { SearchBar } from '../../components/common/SearchBar';
import { 
  Vote, 
  Plus, 
  BarChart3, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PollWithDetails } from '../../types';

export const Polls: React.FC = () => {
  const navigate = useNavigate();
  const { data: polls = [], isLoading, error } = useAdminPolls();
  const deletePollMutation = useDeletePoll();

  const [searchQuery, setSearchQuery] = useState('');
  const [pollToDelete, setPollToDelete] = useState<PollWithDetails | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter polls by search query
  const filteredPolls = polls.filter(p => {
    return p.question.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDeleteConfirm = async () => {
    if (!pollToDelete) return;

    try {
      await deletePollMutation.mutateAsync(pollToDelete.id);
      setPollToDelete(null);
      showToast('Poll deleted successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete poll.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 px-4 sm:px-0 select-none">
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2.5 border ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-800'
                : 'bg-slate-900 text-white border-white/10'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Vote className="w-6 h-6 text-[#0B3C5D]" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              Poll Management
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            WhatsApp-style student polls with section-wise analytics & Excel/PDF export.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/polls/create')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/10 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#D9B310]" />
          <span>Create Poll</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="w-full sm:max-w-xs">
          <SearchBar onSearchChange={setSearchQuery} placeholder="Search polls..." />
        </div>
        <span className="text-[11px] font-bold text-slate-400 shrink-0">
          {filteredPolls.length} Poll{filteredPolls.length !== 1 ? 's' : ''} Posted
        </span>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>Failed to load polls. Please verify database connection.</span>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse" />
          ))}
        </div>
      )}

      {/* POLLS LIST */}
      {!isLoading && !error && filteredPolls.length > 0 && (
        <div className="space-y-3.5">
          {filteredPolls.map(poll => {
            const voterCount = poll.total_voted || 0;

            return (
              <div
                key={poll.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {poll.allow_multiple_answers ? 'Multiple Answers' : 'Single Answer'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {poll.options.length} Options
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {poll.question}
                    </h3>
                  </div>

                  {/* Voters metric */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-right shrink-0 flex sm:flex-col justify-between items-center sm:items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Students Voted
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#0B3C5D]">
                      {voterCount}
                    </span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/polls/${poll.id}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#D9B310]" />
                      <span>View Results</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPollToDelete(poll)}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Poll"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && !error && filteredPolls.length === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Vote className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
            No Polls Found
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? 'No polls match your search query.'
              : 'You have not created any polls yet. Click below to create your first WhatsApp-style poll.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/polls/create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3C5D] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-[#082d47] transition-all"
          >
            <Plus className="w-4 h-4 text-[#D9B310]" />
            <span>Create Poll</span>
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {pollToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Delete Poll
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPollToDelete(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{pollToDelete.question}"</span>? All votes and responses will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPollToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-md shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Polls;
