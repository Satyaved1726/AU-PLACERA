import React, { useEffect, useState } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { usePosts } from '../../features/posts/hooks/usePosts';
import { PostCard } from '../../features/posts/components/PostCard';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { StudentPollCard } from '../../features/polls/components/StudentPollCard';
import { Bell, AlertCircle, GraduationCap, Star, CheckCircle2 } from 'lucide-react';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post, PollWithDetails } from '../../types';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useStudentPolls } from '../../features/polls/hooks/usePolls';

type UnifiedFeedItem = 
  | { type: 'post'; id: string; data: Post; created_at: string; isPriority: boolean }
  | { type: 'poll'; id: string; data: PollWithDetails; created_at: string; isPriority: boolean };

export const NoticeBoard: React.FC = () => {
  const { profile } = useAuth();
  const [realtimeHealthy, setRealtimeHealthy] = useState(true);
  const { data: posts, isLoading: isPostsLoading, error: postsError } = usePosts(realtimeHealthy ? false : 30000);
  const { data: polls = [], isLoading: isPollsLoading, error: pollsError } = useStudentPolls(profile);
  const queryClient = useQueryClient();
  const oiaEligible = profile?.oia_eligible || false;

  // Search and filter tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'opportunity' | 'announcement'>('all');

  // Toast feedback state for polling actions
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

  // Handle auto-scroll to poll when pollId parameter is in URL
  useEffect(() => {
    if (pollIdParam && polls && polls.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`poll-${pollIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pollIdParam, polls]);

  // Subscribe to real-time changes on public.posts to invalidate React Query cache
  useEffect(() => {
    const channel = supabase
      .channel('public:posts_notice_board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('[OIA] Realtime posts change event received:', payload);
          }
          queryClient.invalidateQueries({ queryKey: ['posts', 'active', oiaEligible] });
        }
      )
      .subscribe((status, err) => {
        if (import.meta.env.DEV) {
          console.log('[OIA] Realtime posts channel status event:', status, err);
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

  // Filter posts based on search key and active tab
  const filteredPosts = (posts || []).filter(n => {
    const text = (
      (n.company_name || '') + ' ' + 
      (n.opportunity_title || '') + ' ' + 
      n.original_content
    ).toLowerCase();
    
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'priority') matchesTab = Boolean(n.is_top_priority);
    else if (activeTab === 'opportunity') matchesTab = n.post_type === 'opportunity';
    else if (activeTab === 'announcement') matchesTab = n.post_type === 'announcement';

    return matchesSearch && matchesTab;
  });

  // Filter polls based on search key and active tab
  const filteredPolls = (polls || []).filter(p => {
    const optionsText = p.options.map(o => o.option_text).join(' ');
    const text = (p.question + ' ' + optionsText).toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());

    if (activeTab === 'priority') return matchesSearch && Boolean(p.is_priority);
    if (activeTab === 'all') return matchesSearch;
    return false; // Polls don't belong in opportunities or announcements tabs
  });

  // Combine into unified feed items
  const feedItems: UnifiedFeedItem[] = [
    ...filteredPosts.map(post => ({
      type: 'post' as const,
      id: `post-${post.id}`,
      data: post,
      created_at: post.created_at,
      isPriority: Boolean(post.is_top_priority)
    })),
    ...filteredPolls.map(poll => ({
      type: 'poll' as const,
      id: `poll-${poll.id}`,
      data: poll,
      created_at: poll.created_at,
      isPriority: Boolean(poll.is_priority)
    }))
  ];

  // Unified Sorting:
  // 1. Priority items at the top (Priority Posts, Priority Opportunities, Priority Polls)
  // 2. Normal items following
  // 3. Within each tier, newest items appear first (created_at DESC)
  const sortedFeedItems = feedItems.sort((a, b) => {
    if (a.isPriority !== b.isPriority) {
      return a.isPriority ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const isLoading = isPostsLoading || isPollsLoading;
  const hasError = postsError || pollsError;

  // Motion container variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.04
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
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none px-4 sm:px-0">
      
      {/* Toast Notification Banner */}
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
          Access active drives, company registrations, live polls, and announcements. Everything in one unified timeline.
        </p>
      </div>

      {/* Section Search Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">Notice Board</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
            AIML Recruitment Notice Stream
          </p>
        </div>
        
        {/* Search Input */}
        <SearchBar 
          onSearchChange={setSearchQuery} 
          placeholder="Search notices, opportunities, polls..." 
          className="w-full sm:max-w-xs" 
        />
      </div>

      {/* Swipeable Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'all'
              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('priority')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all ${
            activeTab === 'priority'
              ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm shadow-amber-600/5'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Star className={`h-3 w-3 ${activeTab === 'priority' ? 'fill-current text-amber-500' : 'text-slate-400'}`} />
          <span>Priority</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opportunity')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'opportunity'
              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Opportunities
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcement')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
            activeTab === 'announcement'
              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Announcements
        </button>
      </div>

      {/* ERROR MESSAGE STATE */}
      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>We couldn't retrieve updates from the server. Please check your internet connection and reload.</span>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {isLoading && <PostSkeleton />}

      {/* EMPTY LIST STATE */}
      {!isLoading && !hasError && sortedFeedItems.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Bell className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No active updates</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {searchQuery
              ? 'No notices or polls match your search query.'
              : 'No updates match the selected filter. Check back soon!'}
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* ONE UNIFIED CHRONOLOGICAL FEED (POSTS, POLLS, OPPORTUNITIES)     */}
      {/* ================================================================ */}
      {!isLoading && !hasError && sortedFeedItems.length > 0 && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {sortedFeedItems.map(item => (
            <motion.div key={item.id} variants={cardVariants}>
              {item.type === 'post' ? (
                <PostCard post={item.data} onViewDetail={setSelectedPost} />
              ) : (
                <StudentPollCard
                  poll={item.data}
                  studentId={profile?.id || ''}
                  onToast={showToast}
                  isHighlighted={item.data.id === pollIdParam}
                />
              )}
            </motion.div>
          ))}
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
