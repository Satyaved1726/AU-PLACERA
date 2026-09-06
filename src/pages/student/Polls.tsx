import React, { useState } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { useStudentPolls } from '../../features/polls/hooks/usePolls';
import { StudentPollCard } from '../../features/polls/components/StudentPollCard';
import { SearchBar } from '../../components/common/SearchBar';
import { 
  Vote, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Inbox, 
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Polls: React.FC = () => {
  const { profile } = useAuth();
  const { data: polls = [], isLoading, error } = useStudentPolls(profile);

  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter polls by search query
  const filteredPolls = polls.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = p.question.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
    return matchesQuery;
  });

  const activePolls = filteredPolls.filter(p => p.status === 'active');
  const closedPolls = filteredPolls.filter(p => p.status === 'closed');

  const displayedPolls = activeTab === 'active' ? activePolls : closedPolls;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-0 select-none">
      
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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#0B3C5D]/10 rounded-xl text-[#0B3C5D]">
                <Vote className="w-6 h-6 text-[#0B3C5D]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                Student Polls
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
              Participate in placement preference surveys and department interest checks. Each student is allocated one verified response per poll.
            </p>
          </div>

          {/* Student Batch/Section Info Chip */}
          {profile && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:text-right shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                Target Section
              </span>
              <span className="text-xs font-black text-slate-800">
                {profile.branch} • {profile.section || 'Unassigned'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Batch {profile.batch || '2023-2027'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'active'
                ? 'bg-white text-[#0B3C5D] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Active Polls</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {activePolls.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'closed'
                ? 'bg-white text-[#0B3C5D] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Past / Closed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
              {closedPolls.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
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
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-28 bg-slate-200 rounded-full mb-3" />
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-2" />
              <div className="h-4 w-1/2 bg-slate-100 rounded-lg mb-6" />
              <div className="h-10 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* POLLS LIST */}
      {!isLoading && !error && displayedPolls.length > 0 && (
        <div className="space-y-4">
          {displayedPolls.map(poll => (
            <StudentPollCard
              key={poll.id}
              poll={poll}
              studentId={profile?.id || ''}
              onToast={showToast}
            />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && !error && displayedPolls.length === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
            {activeTab === 'active' ? 'No Active Polls Available' : 'No Closed Polls'}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
            {activeTab === 'active'
              ? 'There are currently no active placement polls targeted to your section. Check back later for new survey updates.'
              : 'You have not participated in any closed or archived polls yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Polls;
