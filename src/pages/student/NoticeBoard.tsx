import React, { useEffect, useState, useMemo } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { usePosts } from '../../features/posts/hooks/usePosts';
import { PostCard } from '../../features/posts/components/PostCard';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { StudentPollCard } from '../../features/polls/components/StudentPollCard';
import { 
  Bell, 
  AlertCircle, 
  GraduationCap, 
  Star, 
  Vote, 
  CheckCircle2, 
  ArrowUp
} from 'lucide-react';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post, PollWithDetails } from '../../types';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useStudentPolls } from '../../features/polls/hooks/usePolls';

type UnifiedFeedItem =
  | { id: string; type: 'post'; post: Post; created_at: string; is_priority: boolean }
  | { id: string; type: 'poll'; poll: PollWithDetails; created_at: string; is_priority: boolean };

export const NoticeBoard: React.FC = () => {
  const { profile } = useAuth();
  const [realtimeHealthy, setRealtimeHealthy] = useState(true);
  const { data: posts, isLoading: isPostsLoading, error: postsError } = usePosts(realtimeHealthy ? false : 30000);
  const { data: polls = [], isLoading: isPollsLoading, error: pollsError } = useStudentPolls(profile);
  const queryClient = useQueryClient();
  const oiaEligible = profile?.oia_eligible || false;

  // Search and filter tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'opportunity' | 'announcement' | 'poll'>('all');

  // Floating indicator when new content arrives while user has scrolled down
  const [showNewUpdatesIndicator, setShowNewUpdatesIndicator] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selected post for detail modal view
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdParam = searchParams.get('postId');
  const pollIdParam = searchParams.get('pollId');

  // Auto-dismiss indicator when user manually scrolls near the top
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY <= 100) {
        setShowNewUpdatesIndicator(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewUpdatesIndicator(false);
  };

  // Handle auto-opening of post details from push notification parameter redirect
  useEffect(() => {
    if (postIdParam && posts && posts.length > 0) {
      const targetPost = posts.find(p => p.id === postIdParam);
      if (targetPost) {
        setSelectedPost(targetPost);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('postId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [postIdParam, posts, searchParams, setSearchParams]);

  // Handle deep-linking to target poll
  useEffect(() => {
    if (pollIdParam && polls && polls.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`poll-${pollIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pollIdParam, polls]);

  // Unified Realtime Subscription for Posts & Polls
  useEffect(() => {
    const channel = supabase
      .channel('public:unified_notice_board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('[NoticeBoard] Realtime posts change:', payload);
          }
          if (payload.eventType === 'INSERT' && window.scrollY > 150) {
            setShowNewUpdatesIndicator(true);
          }
          queryClient.invalidateQueries({ queryKey: ['posts', 'active', oiaEligible] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('[NoticeBoard] Realtime polls change:', payload);
          }
          if (payload.eventType === 'INSERT' && window.scrollY > 150) {
            setShowNewUpdatesIndicator(true);
          }
          queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_responses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_response_options' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['studentPolls'] });
        }
      )
      .subscribe((status, err) => {
        if (import.meta.env.DEV) {
          console.log('[NoticeBoard] Realtime channel status:', status, err);
        }
        if (status === 'SUBSCRIBED') {
          setRealtimeHealthy(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeHealthy(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, oiaEligible]);

  // Construct Unified Live Feed with Priority & Newest-First Ordering
  const { priorityItems, normalItems, allUnifiedItems } = useMemo(() => {
    const postItems: UnifiedFeedItem[] = (posts || []).map(p => ({
      id: `post-${p.id}`,
      type: 'post',
      post: p,
      created_at: p.created_at,
      is_priority: !!p.is_top_priority
    }));

    const pollItems: UnifiedFeedItem[] = (polls || []).map(poll => ({
      id: `poll-${poll.id}`,
      type: 'poll',
      poll: poll,
      created_at: poll.created_at,
      is_priority: false
    }));

    // Filter by Tab and Search Key
    const filtered = [...postItems, ...pollItems].filter(item => {
      // 1. Tab match
      let matchesTab = true;
      if (activeTab === 'priority') {
        matchesTab = item.is_priority;
      } else if (activeTab === 'opportunity') {
        matchesTab = item.type === 'post' && item.post.post_type === 'opportunity';
      } else if (activeTab === 'announcement') {
        matchesTab = item.type === 'post' && item.post.post_type === 'announcement';
      } else if (activeTab === 'poll') {
        matchesTab = item.type === 'poll';
      }

      if (!matchesTab) return false;

      // 2. Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      if (item.type === 'post') {
        const text = (
          (item.post.company_name || '') + ' ' + 
          (item.post.opportunity_title || '') + ' ' + 
          item.post.original_content
        ).toLowerCase();
        return text.includes(q);
      } else {
        const questionMatch = item.poll.question.toLowerCase().includes(q);
        const optionMatch = item.poll.options.some(opt => opt.option_text.toLowerCase().includes(q));
        return questionMatch || optionMatch;
      }
    });

    // 3. Strict Feed Ordering:
    // FIRST: Active Priority Alerts (ordered newest first)
    // SECOND: All normal content (Polls, Announcements, Opportunities, Posts) ordered newest first
    const priorities = filtered
      .filter(item => item.is_priority)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const normals = filtered
      .filter(item => !item.is_priority)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      priorityItems: priorities,
      normalItems: normals,
      allUnifiedItems: [...priorities, ...normals]
    };
  }, [posts, polls, activeTab, searchQuery]);

  const isLoading = isPostsLoading || isPollsLoading;
  const error = postsError || pollsError;

  // Motion container variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' as any }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0 relative">
      
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

      {/* Floating 'New updates available' Indicator */}
      <AnimatePresence>
        {showNewUpdatesIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              type="button"
              onClick={handleScrollToTop}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3C5D] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-xl border border-white/20 hover:bg-[#082d47] transition-all active:scale-95 animate-bounce"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>New updates available</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner */}
      <div className="bg-[#0B3C5D] text-white p-6 rounded-2xl shadow-md border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5 pointer-events-none">
          <GraduationCap className="h-64 w-64 text-[#D9B310]" />
        </div>
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />

        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl font-medium leading-relaxed">
          Access active drives, company registrations, daily polls, and training updates. Everything appears in one unified live feed below.
        </p>
      </div>

      {/* Section Search Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Daily Feed</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
            AIML Live Communication Stream
          </p>
        </div>
        
        {/* Search Input */}
        <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
      </div>

      {/* Unified Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'all'
              ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm shadow-blue-900/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          All Notices
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('priority')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all ${
            activeTab === 'priority'
              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm shadow-amber-600/5'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Star className={`h-3 w-3 ${activeTab === 'priority' ? 'fill-current text-amber-500' : 'text-slate-400'}`} />
          <span>Priority Alert</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opportunity')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'opportunity'
              ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm shadow-blue-900/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Placement & Internships
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcement')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'announcement'
              ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm shadow-blue-900/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Announcements
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('poll')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all ${
            activeTab === 'poll'
              ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm shadow-blue-900/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Vote className={`h-3 w-3 ${activeTab === 'poll' ? 'text-white' : 'text-slate-400'}`} />
          <span>Polls</span>
        </button>
      </div>

      {/* ERROR MESSAGE STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>We couldn't retrieve the latest updates from the server. Please check your connection and reload.</span>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {isLoading && <PostSkeleton />}

      {/* EMPTY FEED STATE */}
      {!isLoading && allUnifiedItems.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Bell className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No updates found</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            No placement notices, announcements, or polls match your current filter. Check back soon for updates.
          </p>
        </div>
      )}

      {/* UNIFIED CONTINUOUS FEED */}
      {!isLoading && allUnifiedItems.length > 0 && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Active Priority Alerts (Kept above normal content while active) */}
          {priorityItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-amber-700 uppercase tracking-widest px-1 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-current text-amber-500" />
                <span>Active Priority Alerts</span>
              </h4>
              
              <div className="space-y-4">
                {priorityItems.map(item => (
                  <motion.div key={item.id} variants={cardVariants}>
                    {item.type === 'post' ? (
                      <PostCard post={item.post} onViewDetail={setSelectedPost} />
                    ) : (
                      <StudentPollCard
                        poll={item.poll}
                        studentId={profile?.id || ''}
                        onToast={showToast}
                        isHighlighted={pollIdParam === item.poll.id}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Normal Feed Stream: Polls, Opportunities, Announcements, and Posts */}
          {normalItems.length > 0 && (
            <div className="space-y-4">
              {priorityItems.length > 0 && (
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Daily Stream
                </h4>
              )}
              {normalItems.map(item => (
                <motion.div key={item.id} variants={cardVariants}>
                  {item.type === 'post' ? (
                    <PostCard post={item.post} onViewDetail={setSelectedPost} />
                  ) : (
                    <StudentPollCard
                      poll={item.poll}
                      studentId={profile?.id || ''}
                      onToast={showToast}
                      isHighlighted={pollIdParam === item.poll.id}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* OVERLAY DIALOG DETAILS MODAL */}
      <PostDetail
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

    </div>
  );
};
export default NoticeBoard;

