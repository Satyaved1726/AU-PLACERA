import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useSavedPosts } from '../../features/saved/hooks/useSavedPosts';
import { PostCard } from '../../features/posts/components/PostCard';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { Bookmark, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Post } from '../../types';

export const Saved: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const studentId = profile?.id;

  // Load saved posts
  const { data: savedPosts = [], isLoading, error } = useSavedPosts(studentId);

  // Selected post detail overlay
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Animation variants
  const containerVariants: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  };

  const cardVariants: any = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Header segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Saved Opportunities</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Keep important placement opportunities here for quick access.
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>Failed to query your saved notices. Please verify connection and try again.</span>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {isLoading && <PostSkeleton />}

      {/* EMPTY LIST STATE */}
      {!isLoading && !error && savedPosts.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl p-8 max-w-sm mx-auto shadow-sm"
        >
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Bookmark className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Nothing saved yet</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Save notices from your notice board stream to keep track of them here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/notice-board')}
            className="mt-6 h-9 px-4.5 text-[9px] font-black uppercase tracking-wider text-white bg-primary hover:bg-primary-dark rounded-xl active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-md shadow-primary/5 select-none"
          >
            <Sparkles className="h-3 w-3 text-white" />
            <span>Browse Notices</span>
          </button>
        </motion.div>
      )}

      {/* CARDS LISTING GRID */}
      {!isLoading && !error && savedPosts.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4"
        >
          {savedPosts.map(post => (
            <motion.div key={post.id} variants={cardVariants}>
              <PostCard post={post} onViewDetail={setSelectedPost} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Post Detail Drawer Sheet */}
      <PostDetail
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

    </div>
  );
};
export default Saved;
