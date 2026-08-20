import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useMyRegistrations } from '../../features/registrations/hooks/useMyRegistrations';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { ClipboardCheck, Sparkles, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Post } from '../../types';

export const Registered: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const studentId = profile?.id;

  // Load registered opportunities
  const { data: registrations = [], isLoading, error } = useMyRegistrations(studentId);

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
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Registered Opportunities</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            View the drives and placement posts you have registered for.
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>Failed to query your registered drives. Please verify connection and try again.</span>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {isLoading && <PostSkeleton />}

      {/* EMPTY LIST STATE */}
      {!isLoading && !error && registrations.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl p-8 max-w-sm mx-auto shadow-sm"
        >
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-full inline-block mb-3 text-emerald-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No registrations yet</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Click 'Mark as Registered' on any placement notice to log your participation here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/notice-board')}
            className="mt-6 h-9 px-4.5 text-[9px] font-black uppercase tracking-wider text-white bg-primary hover:bg-primary-dark rounded-xl active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-md shadow-primary/5 select-none"
          >
            <Sparkles className="h-3 w-3 text-white" />
            <span>Browse Notice Board</span>
          </button>
        </motion.div>
      )}

      {/* CARDS LISTING GRID */}
      {!isLoading && !error && registrations.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4"
        >
          {registrations.map(reg => (
            <motion.div key={reg.id} variants={cardVariants}>
              <div 
                onClick={() => reg.post && setSelectedPost(reg.post)}
                className="border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 cursor-pointer active:scale-[0.99] transition-all bg-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/50 shrink-0">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(reg.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-150 text-emerald-650 px-2 py-0.5 rounded">
                        Registered
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight mt-2">
                      {reg.company_name || 'Placement Drive Announcement'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1 truncate max-w-xs sm:max-w-md">
                      {reg.opportunity_title || 'Registered Notice'}
                    </p>
                  </div>
                </div>

                {reg.post && (
                  <button
                    type="button"
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shrink-0 self-end sm:self-center"
                  >
                    <span>View Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
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

export default Registered;
