import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useStudentPolls } from '../../features/polls/hooks/usePolls';
import { StudentPollCard } from '../../features/polls/components/StudentPollCard';
import { SearchBar } from '../../components/common/SearchBar';
import { 
  Vote, 
  CheckCircle2, 
  AlertCircle, 
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Polls: React.FC = () => {
  const { pollId } = useParams<{ pollId?: string }>();
  const { profile } = useAuth();
  const { data: polls = [], isLoading, error } = useStudentPolls(profile);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unvoted' | 'voted'>('all');

  // Auto-scroll to target poll when navigating from Notice Board or Push Notification
  useEffect(() => {
    if (pollId && polls.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`poll-${pollId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pollId, polls]);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter polls
  const filteredPolls = polls.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.question.toLowerCase().includes(q);
    const hasVoted = !!p.user_vote;

    if (!matchesSearch) return false;
    if (filterType === 'unvoted') return !hasVoted;
    if (filterType === 'voted') return hasVoted;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-4 sm:px-0 select-none">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#0B3C5D]/10 rounded-xl text-[#0B3C5D]">
                <Vote className="w-5 h-5 text-[#0B3C5D]" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Student Polls
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Cast your vote on placement polls and preference surveys.
            </p>
          </div>

          {profile && (
            <div className="hidden sm:block text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                {profile.branch} • {profile.section || 'All Sections'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block">
                Batch {profile.batch || '2023-2027'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-200/60 rounded-2xl">
          {(['all', 'unvoted', 'voted'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterType(f)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                filterType === f
                  ? 'bg-white text-[#0B3C5D] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unvoted' ? 'Need Vote' : 'Voted'}
            </button>
          ))}
        </div>

        <div className="sm:max-w-xs w-full">
          <SearchBar onSearchChange={setSearchQuery} placeholder="Search polls..." />
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>Failed to load polls. Please verify your connection or try again later.</span>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse" />
          ))}
        </div>
      )}

      {/* POLLS FEED */}
      {!isLoading && !error && filteredPolls.length > 0 && (
        <div className="space-y-4">
          {filteredPolls.map(poll => (
            <StudentPollCard
              key={poll.id}
              poll={poll}
              studentId={profile?.id || ''}
              onToast={showToast}
              isHighlighted={poll.id === pollId}
            />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && !error && filteredPolls.length === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
            No Polls Available
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No polls match your search query.'
              : filterType === 'unvoted'
              ? 'You have voted on all active polls!'
              : 'There are currently no polls posted.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Polls;
