import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Calendar, Star, ExternalLink, CheckCircle2, AlertCircle, ArrowLeft, Bookmark } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { useAuth } from '../../../features/auth/useAuth';
import { useIsRegistered } from '../../../features/registrations/hooks/useIsRegistered';
import { useRegister } from '../../../features/registrations/hooks/useRegister';
import { useIsSaved } from '../../../features/saved/hooks/useIsSaved';
import { useSavePost } from '../../../features/saved/hooks/useSavePost';
import { useUnsavePost } from '../../../features/saved/hooks/useUnsavePost';
import type { Post } from '../../../types';

interface PostDetailProps {
  post: Post | null;
  onClose: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, onClose }) => {
  const shouldReduceMotion = useReducedMotion();
  const { profile } = useAuth();
  const studentId = profile?.id;
  const isStudent = profile?.role === 'student';

  // State queries/mutations for registration tracking
  const { data: isRegistered = false } = useIsRegistered(studentId, post?.id);
  const registerMutation = useRegister();

  // Saved check and mutations
  const { data: isSaved = false } = useIsSaved(studentId, post?.id);
  const saveMutation = useSavePost();
  const unsaveMutation = useUnsavePost();

  // Local Toast feedbacks
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isErrorToast, setIsErrorToast] = useState(false);

  const triggerToast = (msg: string, isErr = false) => {
    setIsErrorToast(isErr);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safeguard: Block non-OIA-eligible students from seeing OIA post details
  const isOiaPost = post?.post_type === 'oia' || post?.audience === 'oia';
  if (!post || (isOiaPost && profile?.role === 'student' && !profile?.oia_eligible)) {
    return null;
  }

  const isOpportunity = post.post_type === 'opportunity';

  // Helper to extract ALL raw URLs from original content uniquely
  const extractUrls = (text: string): string[] => {
    const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const matches = text.match(regex);
    if (!matches) return [];
    // remove trailing punctuation from URLs
    const cleaned = matches.map(url => url.replace(/[\.\,\;\:\)\}\]]$/, ''));
    return Array.from(new Set(cleaned));
  };

  const urls = extractUrls(post.original_content);

  // Mark student registered on click
  const handleRegisterClick = async () => {
    if (!studentId) return;
    
    // Safeguard check
    if (isOiaPost && profile?.role === 'student' && !profile?.oia_eligible) {
      triggerToast('Access Denied: You are not eligible for OIA opportunities.', true);
      return;
    }

    try {
      await registerMutation.mutateAsync({
        postId: post.id,
        studentId
      });
      triggerToast('Registration marked successfully.');
    } catch {
      triggerToast('Unable to save your registration. Please try again.', true);
    }
  };

  // Toggle Save bookmark status
  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId) return;
    try {
      if (isSaved) {
        await unsaveMutation.mutateAsync({ postId: post.id, studentId });
        triggerToast('Removed from saved posts.');
      } else {
        await saveMutation.mutateAsync({ postId: post.id, studentId });
        triggerToast('Post saved successfully.');
      }
    } catch (err) {
      console.error('Failed to toggle save status', err);
      triggerToast('Unable to update saved status. Please try again.', true);
    }
  };

  // Framer Motion variations for desktop center popup
  const desktopVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  // Framer Motion variations for mobile slide-up bottom sheet
  const mobileVariants = {
    hidden: { y: '100%' },
    visible: { 
      y: 0, 
      transition: { type: 'spring', damping: 25, stiffness: 220 }
    },
    exit: { 
      y: '100%',
      transition: { duration: 0.2 }
    }
  };

  const variants = (shouldReduceMotion 
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : (window.innerWidth < 768 ? mobileVariants : desktopVariants)) as any;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 select-none">
        
        {/* Backdrop background overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Local Toast inside Detail View */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border ${
                isErrorToast 
                  ? 'bg-red-50 text-red-700 border-red-100' 
                  : 'bg-slate-900 text-white border-white/5'
              }`}
            >
              {isErrorToast ? (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Window */}
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag={window.innerWidth < 768 ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.1, bottom: 0.8 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) {
              onClose();
            }
          }}
          className="w-full h-[92vh] md:h-auto md:max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border-0 md:border border-slate-200/80 overflow-hidden relative z-10 max-h-[92vh] md:max-h-[90vh] flex flex-col pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-0 touch-pan-y"
        >
          {/* Mobile swipe-down drag indicator */}
          <div className="md:hidden flex justify-center pt-3 pb-1.5 shrink-0 bg-white select-none cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1 bg-slate-250 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between z-10 relative shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="md:hidden flex items-center gap-1.5 text-slate-600 hover:text-slate-800 font-black transition-all text-xs uppercase"
                aria-label="Back to notice board"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Back</span>
              </button>
              
              <div className="hidden md:flex items-center gap-2">
                {post.is_top_priority && (
                  <Badge variant="warning" className="flex items-center gap-1 py-0.5 border-amber-250 bg-amber-50 text-amber-700">
                    <Star className="h-3 w-3 fill-current text-amber-500" />
                    <span>Priority</span>
                  </Badge>
                )}
                {isOpportunity ? (
                  <Badge variant="primary" className="py-0.5">Opportunity</Badge>
                ) : post.post_type === 'oia' ? (
                  <Badge variant="warning" className="py-0.5 bg-purple-50 text-purple-700 border-purple-100">OIA</Badge>
                ) : (
                  <Badge variant="neutral" className="py-0.5">Announcement</Badge>
                )}
              </div>
            </div>
            
            <div className="md:hidden flex items-center gap-1.5">
              {post.is_top_priority && (
                <Badge variant="warning" className="flex items-center gap-1 py-0.5 border-amber-250 bg-amber-50 text-amber-700">
                  <Star className="h-2.5 w-2.5 fill-current text-amber-500" />
                </Badge>
              )}
              {isOpportunity ? (
                <Badge variant="primary" className="py-0.5">Opportunity</Badge>
              ) : post.post_type === 'oia' ? (
                <Badge variant="warning" className="py-0.5 bg-purple-50 text-purple-700 border-purple-100">OIA</Badge>
              ) : (
                <Badge variant="neutral" className="py-0.5">Announcement</Badge>
              )}
            </div>

            <button
              onClick={onClose}
              className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors h-9 w-9 items-center justify-center"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-none pb-16">
            {/* Header info */}
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                {post.company_name ? 'Company' : 'Announcement Update'}
              </span>
              
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                {post.company_name ? `${post.company_name} — ${post.opportunity_title}` : post.opportunity_title}
              </h2>
              
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Published {new Date(post.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                <span> • Posted by: {post.profiles?.full_name || 'Placement Cell'}</span>
              </div>
            </div>

            {/* Preserved Raw Content Block */}
            {post.original_content && post.original_content.trim() !== '' && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">
                  Original Notice
                </span>
                <div className="p-5 bg-slate-50/70 text-slate-700 border border-slate-200/80 rounded-2xl font-sans text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text break-words shadow-sm">
                  {post.original_content.split(/(\*[^*]+\*)/g).map((part, idx) => {
                    if (part.startsWith('*') && part.endsWith('*')) {
                      const cleanText = part.slice(1, -1);
                      return (
                        <strong key={idx} className="font-extrabold text-[#0B3C5D] bg-[#0B3C5D]/5 px-1.5 py-0.5 rounded border border-[#0B3C5D]/10">
                          {cleanText}
                        </strong>
                      );
                    }
                    return part;
                  })}
                </div>
              </div>
            )}

            {/* Application and external links block */}
            {urls.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">
                  Registration & Resource Links
                </span>
                <div className="space-y-2">
                  {urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-primary hover:text-primary-dark active:scale-[0.98] transition-all hover:bg-slate-100/50"
                    >
                      <span className="pr-4 underline select-text break-all whitespace-pre-wrap">{url}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
              Anurag University • Department of AIML
            </div>
            
            {/* Student layout action panel */}
            {isStudent ? (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Save/Bookmark Action */}
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`h-10 px-4 rounded-xl text-[10px] uppercase tracking-wider font-black flex items-center justify-center gap-1.5 transition-all select-none border ${
                    isSaved
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label={isSaved ? "Remove bookmark" : "Save bookmark"}
                >
                  <Bookmark className={`h-3.5 w-3.5 shrink-0 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {isOpportunity && (
                  <>
                    {urls.length > 0 && (
                      <a
                        href={urls[0].startsWith('http') ? urls[0] : `https://${urls[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-grow sm:flex-initial"
                      >
                        <button
                          type="button"
                          className="w-full h-10 px-4 inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-black text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>Open Link</span>
                        </button>
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={isRegistered || registerMutation.isPending}
                      onClick={handleRegisterClick}
                      className={`flex-grow sm:flex-initial h-10 px-5 rounded-xl text-[10px] uppercase tracking-wider font-black flex items-center justify-center gap-1.5 transition-all select-none ${
                        isRegistered
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-default'
                          : 'bg-primary hover:bg-primary-dark text-white active:scale-95'
                      }`}
                    >
                      {registerMutation.isPending ? (
                        <span className="animate-pulse">Marking...</span>
                      ) : isRegistered ? (
                        <span className="flex items-center gap-1">
                          <span>✓ Registered</span>
                        </span>
                      ) : (
                        <span>Mark as Registered</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Default admin close button
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-grow sm:flex-initial h-10 px-5 text-[10px] uppercase tracking-wider font-black text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Close Details
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default PostDetail;
