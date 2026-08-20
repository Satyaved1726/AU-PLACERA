import React, { useState } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { usePosts } from '../../features/posts/hooks/usePosts';
import { PostCard } from '../../features/posts/components/PostCard';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { Bell, AlertCircle, GraduationCap, Star } from 'lucide-react';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { motion } from 'framer-motion';
import type { Post } from '../../types';

export const NoticeBoard: React.FC = () => {
  const { profile } = useAuth();
  const { data: posts, isLoading, error } = usePosts();

  // Search and filter tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'opportunity' | 'announcement'>('all');

  // Selected post for detail modal view
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filter listings based on search key and active tab
  const filteredNotices = (posts || []).filter(n => {
    const text = (
      (n.company_name || '') + ' ' + 
      (n.opportunity_title || '') + ' ' + 
      n.original_content
    ).toLowerCase();
    
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'priority') matchesTab = n.is_top_priority;
    else if (activeTab === 'opportunity') matchesTab = n.post_type === 'opportunity';
    else if (activeTab === 'announcement') matchesTab = n.post_type === 'announcement';

    return matchesSearch && matchesTab;
  });

  const priorityNotices = filteredNotices.filter(n => n.is_top_priority);
  const normalNotices = filteredNotices.filter(n => !n.is_top_priority);

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
      transition: { duration: 0.3, ease: 'easeOut' as any }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0">
      
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
          Access active drives, company registrations, and learning guides. Log registration updates and complete required applications below.
        </p>
      </div>

      {/* Section Search Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Notice Board</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
            AIML Recruitment Notice Stream
          </p>
        </div>
        
        {/* Search Input */}
        <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
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
          All Notices
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('priority')}
          className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all ${
            activeTab === 'priority'
              ? 'bg-amber-50 border-amber-255 text-amber-700 shadow-sm shadow-amber-600/5'
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
              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
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
              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Announcements
        </button>
      </div>

      {/* ERROR MESSAGE STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>We couldn't retrieve notices from the server. Please check your internet connection and reload.</span>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {isLoading && <PostSkeleton />}

      {/* EMPTY LIST STATE */}
      {!isLoading && filteredNotices.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Bell className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No active notices</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            No placement opportunities match your filters. Check back soon for announcements.
          </p>
        </div>
      )}

      {/* CARDS LIST STACK */}
      {!isLoading && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Priority Notices block */}
          {priorityNotices.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                ⭐ Priority Notices
              </h4>
              
              {/* Mobile Horizontal Swipe Carousel */}
              <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 -mx-4 px-4 pb-2.5 select-none">
                {priorityNotices.map(post => (
                  <motion.div 
                    key={post.id} 
                    variants={cardVariants}
                    className="w-[85vw] max-w-[280px] shrink-0 snap-start"
                  >
                    <PostCard post={post} onViewDetail={setSelectedPost} />
                  </motion.div>
                ))}
              </div>

              {/* Desktop Standard List */}
              <div className="hidden md:grid grid-cols-1 gap-4">
                {priorityNotices.map(post => (
                  <motion.div key={post.id} variants={cardVariants}>
                    <PostCard post={post} onViewDetail={setSelectedPost} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Normal Notices block */}
          {normalNotices.length > 0 && (
            <div className="space-y-3">
              {priorityNotices.length > 0 && (
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  General Notices
                </h4>
              )}
              <div className="grid grid-cols-1 gap-4">
                {normalNotices.map(post => (
                  <motion.div key={post.id} variants={cardVariants}>
                    <PostCard post={post} onViewDetail={setSelectedPost} />
                  </motion.div>
                ))}
              </div>
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
