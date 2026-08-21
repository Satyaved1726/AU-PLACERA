import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useMyRegistrations } from '../../features/registrations/hooks/useMyRegistrations';
import { PostDetail } from '../../features/posts/components/PostDetail';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { 
  ClipboardCheck, Sparkles, AlertCircle, ExternalLink, Calendar, 
  Building2, Briefcase, Award 
} from 'lucide-react';
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

  const getDriveType = (post?: Post) => {
    if (!post) return 'Drive Drive';
    if (post.post_type === 'oia') return 'OIA Drive';
    if (post.post_type === 'opportunity') return 'Placement Drive';
    return 'General Announcement';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none px-4 sm:px-0">
      
      {/* Header View: Welcome Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden select-none">
        <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
          {/* Left illustration container */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-650 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 border border-blue-400/20">
            <Briefcase className="h-8 w-8 text-white shrink-0" />
          </div>
          
          {/* Text block */}
          <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-jakarta tracking-tight uppercase">
              Registered Placements
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
              View placement posts and opportunities you have registered for.
            </p>
          </div>

          {/* Right Action Circle Button */}
          <div className="flex shrink-0">
            <button
              type="button"
              onClick={() => navigate('/student/notice-board')}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-50/50 hover:bg-blue-100/70 text-blue-600 border border-blue-100/30 flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm"
              title="Browse Notice Board"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
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
          className="text-center py-16 bg-white border border-slate-200/85 rounded-3xl p-8 max-w-sm mx-auto shadow-sm"
        >
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl inline-block mb-3 text-emerald-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No registrations yet</h3>
          <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
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
                className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col space-y-4 hover:border-slate-300 transition-all duration-200"
              >
                {/* Top Section */}
                <div className="flex items-start gap-4">
                  {/* Green Clipboard icon wrapper */}
                  <div className="p-3.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50 shrink-0 rounded-2xl flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  
                  {/* Badge Row & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 py-1 px-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(reg.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        <ClipboardCheck className="h-3 w-3" />
                        <span>Registered</span>
                      </span>
                    </div>
                    
                    <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight mt-2.5">
                      {reg.company_name || 'Placement drive Announcement'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 truncate max-w-xs sm:max-w-md">
                      {reg.opportunity_title || 'Registered Drive'}
                    </p>
                  </div>
                </div>

                {/* Separator Divider */}
                <div className="border-t border-slate-100 w-full" />

                {/* Split Metadata Row */}
                <div className="grid grid-cols-3 gap-2 py-1 text-center sm:text-left">
                  {/* Company */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">Company</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 truncate">
                      {reg.company_name || 'N/A'}
                    </p>
                  </div>

                  {/* Role */}
                  <div className="space-y-1 border-l border-slate-100 pl-3">
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">Role</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 truncate">
                      {reg.opportunity_title || 'Applicant'}
                    </p>
                  </div>

                  {/* Drive Type */}
                  <div className="space-y-1 border-l border-slate-100 pl-3">
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      <Award className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">Drive Type</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 truncate">
                      {getDriveType(reg.post)}
                    </p>
                  </div>
                </div>

                {/* View Details Button */}
                {reg.post && (
                  <button
                    type="button"
                    onClick={() => setSelectedPost(reg.post || null)}
                    className="w-full mt-2 py-3 bg-[#F4F9FF]/20 hover:bg-[#F4F9FF]/60 text-blue-600 hover:text-blue-700 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all select-none active:scale-[0.98] shadow-sm"
                  >
                    <span>View Details</span>
                    <ExternalLink className="h-3.5 w-3.5" />
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
