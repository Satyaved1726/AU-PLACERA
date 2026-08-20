import React from 'react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Star, Calendar, ArrowRight, Bookmark } from 'lucide-react';
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
        className={`overflow-hidden border transition-all duration-300 ${
          post.is_top_priority 
            ? 'border-amber-300 shadow-[0_4px_16px_-4px_rgba(217,179,16,0.06),0_1px_4px_-2px_rgba(217,179,16,0.04)] bg-amber-50/[0.01]' 
            : 'border-slate-200/80 hover:border-slate-300 hover:shadow-soft bg-white'
        }`}
      >
        {/* Header Badges & Actions */}
        <CardHeader className="bg-slate-50/20 px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            {isOpportunity ? (
              <Badge variant="primary" className="py-0.5">
                Opportunity
              </Badge>
            ) : post.post_type === 'oia' ? (
              <Badge variant="warning" className="py-0.5 bg-purple-50 text-purple-700 border-purple-100">
                OIA Notice
              </Badge>
            ) : (
              <Badge variant="neutral" className="py-0.5">
                Announcement
              </Badge>
            )}

            {(post.audience === 'oia' || post.post_type === 'oia') && (
              <Badge variant="error" className="py-0.5 bg-purple-50 text-purple-750 border-purple-200 font-black">
                OIA ONLY
              </Badge>
            )}

            {post.is_top_priority && (
              <Badge variant="warning" className="py-0.5 flex items-center gap-1 border-amber-250 bg-amber-50 text-amber-700">
                <Star className="h-2.5 w-2.5 fill-current text-amber-500" />
                <span>Priority</span>
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              <span>{getRelativeTime(post.created_at)}</span>
            </div>

            {/* Bookmark button for student role */}
            {isStudent && (
              <button
                type="button"
                onClick={handleToggleSave}
                className={`p-1.5 rounded-lg border transition-all active:scale-[0.9] select-none ${
                  isSaved 
                    ? 'bg-amber-50 border-amber-200 text-amber-600' 
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                aria-label={isSaved ? "Remove bookmark" : "Save bookmark"}
              >
                <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </CardHeader>
        
        {/* Body Content */}
        <CardBody className="p-5 space-y-3">
          <div>
            {post.company_name ? (
              <>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                  Recruiter
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight mt-1">
                  {post.company_name}
                </h3>
                {post.opportunity_title && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Job Profile:</span>
                    <span className="text-xs font-bold text-slate-600 leading-none">{post.opportunity_title}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                  Notice
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight mt-1">
                  {post.opportunity_title}
                </h3>
              </>
            )}
          </div>
          
          {/* Plaintext Monospaced Preview */}
          <p className="text-xs text-slate-500 font-semibold line-clamp-3 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50/50 p-3.5 rounded-xl border border-slate-100/50">
            {post.original_content}
          </p>
        </CardBody>

        {/* Footer target height 44px+ */}
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/5 flex items-center justify-between">
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
            AIML Department
          </span>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(post);
            }}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-black text-primary group-hover:text-primary-dark transition-all active:scale-[0.97]"
          >
            <span>View details</span>
            <ArrowRight className="h-3 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </Card>
    </div>
  );
};
export default PostCard;
