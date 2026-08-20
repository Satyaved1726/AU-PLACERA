import React from 'react';
import { Card, CardBody } from '../../../components/common/Card';
import { 
  Briefcase, 
  Lock, 
  Calendar, 
  Bookmark, 
  Megaphone, 
  FileText, 
  Link2, 
  Quote, 
  Building2, 
  ArrowRight, 
  Star 
} from 'lucide-react';
import { useAuth } from '../../../features/auth/useAuth';
import { useIsSaved } from '../../../features/saved/hooks/useIsSaved';
import { useSavePost } from '../../../features/saved/hooks/useSavePost';
import { useUnsavePost } from '../../../features/saved/hooks/useUnsavePost';
import type { Post } from '../../../types';

interface PostCardProps {
  post: Post;
  onViewDetail: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onViewDetail }) => {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const isStudent = profile?.role === 'student';

  // Bookmark check and mutations
  const { data: isSaved = false } = useIsSaved(studentId, post.id);
  const saveMutation = useSavePost();
  const unsaveMutation = useUnsavePost();

  const isOpportunity = post.post_type === 'opportunity';
  const isOiaOnly = post.audience === 'oia' || post.post_type === 'oia';
  
  // Format dates relatively (e.g. "2h ago")
  const getRelativeTime = (isoString: string): string => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId) return;
    
    try {
      if (isSaved) {
        await unsaveMutation.mutateAsync({ postId: post.id, studentId });
      } else {
        await saveMutation.mutateAsync({ postId: post.id, studentId });
      }
    } catch (err) {
      console.error('Failed to toggle save status', err);
    }
  };

  return (
    <div 
      onClick={() => onViewDetail(post)}
      className="cursor-pointer group select-none"
    >
      <Card 
        elevation={post.is_top_priority ? 3 : 2}
        className={`overflow-hidden border transition-all duration-300 rounded-2xl ${
          post.is_top_priority 
            ? 'border-amber-300 shadow-[0_4px_16px_-4px_rgba(217,179,16,0.06),0_1px_4px_-2px_rgba(217,179,16,0.04)] bg-amber-50/[0.01]' 
            : 'border-slate-100 hover:border-slate-200 hover:shadow-soft bg-white'
        }`}
      >
        <CardBody className="p-6 space-y-5">
          {/* Top Row Badges & Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Badge */}
              {isOpportunity ? (
                <span className="inline-flex items-center gap-1.5 bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                  <span className="h-4 w-4 bg-[#0369A1] text-white rounded-full flex items-center justify-center shrink-0">
                    <Briefcase className="h-2.5 w-2.5" />
                  </span>
                  <span>Opportunity</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-205 text-slate-600 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                  <span className="h-4 w-4 bg-slate-500 text-white rounded-full flex items-center justify-center shrink-0">
                    <FileText className="h-2.5 w-2.5" />
                  </span>
                  <span>Announcement</span>
                </span>
              )}

              {/* OIA ONLY Badge */}
              {isOiaOnly && (
                <span className="inline-flex items-center gap-1.5 bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                  <span className="h-4 w-4 bg-[#DC2626] text-white rounded-full flex items-center justify-center shrink-0">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                  <span>OIA ONLY</span>
                </span>
              )}

              {/* Priority Alert Badge */}
              {post.is_top_priority && (
                <span className="inline-flex items-center gap-1 bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                  <Star className="h-3 w-3 fill-current text-[#F59E0B]" />
                  <span>Priority</span>
                </span>
              )}
            </div>

            {/* Time Relative Indicator & Bookmark Icon */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>{getRelativeTime(post.created_at)}</span>
              </div>

              {/* Bookmark button for student role */}
              {isStudent && (
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`h-7.5 w-7.5 rounded-xl border flex items-center justify-center shadow-sm transition-all active:scale-90 select-none ${
                    isSaved 
                      ? 'bg-amber-50 border-amber-200 text-[#D97706]' 
                      : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label={isSaved ? "Remove bookmark" : "Save bookmark"}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Icon, Title, and 3D Icon Overlay Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-[#F0F7FF] text-[#2563EB] rounded-full flex items-center justify-center shrink-0">
                  <Megaphone className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-wider">Notice</span>
              </div>

              <h3 className="text-base sm:text-[17px] font-black text-slate-800 tracking-tight leading-snug mt-2.5 group-hover:text-primary transition-colors duration-255">
                {post.company_name 
                  ? `${post.company_name} — ${post.opportunity_title || 'Untitled Notice'}`
                  : (post.opportunity_title || 'Untitled Notice')
                }
              </h3>
              <div className="w-10 h-0.75 bg-blue-600 rounded-full mt-2.5" />
            </div>

            {/* Premium 3D-like File Icon */}
            <div className="relative w-16 h-20 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50 rounded-2xl flex items-center justify-center shadow-sm select-none shrink-0 self-center">
              <FileText className="h-9 w-9 text-blue-500/40" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-[#2563EB] text-white rounded-full shadow-md flex items-center justify-center">
                <Link2 className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Light-blue Quotation Box */}
          {post.original_content && post.original_content.trim() !== '' && (
            <div className="bg-[#F4F9FF]/70 border-l-[3.5px] border-[#2563EB] rounded-r-2xl p-4.5 relative overflow-hidden">
              <Quote className="h-8 w-8 text-blue-100 absolute -top-1 -left-1 rotate-180 pointer-events-none opacity-30" />
              <p className="text-xs text-slate-600 font-semibold leading-relaxed font-sans whitespace-pre-wrap select-text relative z-10">
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
              </p>
            </div>
          )}

          {/* Footer Area */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-[#F5F3FF] text-[#7C3AED] rounded-full flex items-center justify-center shrink-0">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider block">
                  Posted by: {post.profiles?.full_name || 'Placement Cell'}
                </span>
                <span className="text-[8px] font-semibold text-slate-450 block leading-none mt-0.5">
                  {post.profiles?.role === 'super_admin' ? 'Placement Head' : 'Placement Coordinator'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(post);
              }}
              className="h-9 px-4.5 bg-gradient-to-r from-blue-600 to-[#2563EB] hover:from-blue-700 hover:to-blue-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>View Details</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default PostCard;
