import React from 'react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Star, Calendar, Edit2, Trash2, Eye, Users } from 'lucide-react';
import { useRegistrations } from '../../../features/registrations/hooks/useRegistrations';
import type { Post } from '../../../types';

interface AdminPostCardProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, currentVal: boolean) => void;
  onToggleArchive: (id: string, currentVal: boolean) => void;
  onViewRegistrations: (post: Post) => void;
  onViewDetails: (post: Post) => void;
}

export const AdminPostCard: React.FC<AdminPostCardProps> = ({
  post,
  onEdit,
  onDelete,
  onViewRegistrations,
  onViewDetails
}) => {
  const isOpportunity = post.post_type === 'opportunity';

  // Load registration counts dynamically
  const { data: registrations = [] } = useRegistrations(isOpportunity ? post.id : undefined);

  return (
    <Card 
      elevation={post.is_top_priority ? 3 : 2}
      className={`overflow-hidden border transition-all relative rounded-2xl ${
        !post.is_active 
          ? 'border-slate-200 bg-slate-50/50 opacity-70 shadow-none' 
          : post.is_top_priority 
            ? 'border-amber-300 shadow-[0_4px_16px_-4px_rgba(217,179,16,0.06)] bg-amber-50/[0.01]' 
            : 'border-slate-200/80 bg-white hover:border-slate-300'
      }`}
    >
      
      {/* Header */}
      <CardHeader className="bg-slate-50/20 px-5 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {post.is_top_priority && (
            <Badge variant="warning" className="py-0.5 flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current text-amber-500" />
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

          {(post.audience === 'oia' || post.post_type === 'oia') && (
            <Badge variant="error" className="py-0.5 bg-purple-50 text-purple-750 border-purple-200 font-black">OIA ONLY</Badge>
          )}

          {!post.is_active && (
            <Badge variant="neutral" className="py-0.5 bg-slate-200 text-slate-555 border-transparent">Archived</Badge>
          )}
        </div>

        {/* Date block on the right */}
        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider select-none shrink-0">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </CardHeader>

      {/* Body */}
      <CardBody className="p-5 space-y-3">
        <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-snug">
          {post.company_name ? `${post.company_name} — ${post.opportunity_title}` : post.opportunity_title}
        </h3>

        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-xs text-slate-700 font-semibold font-sans line-clamp-3 leading-relaxed whitespace-pre-wrap select-text">
          {post.original_content}
        </div>
      </CardBody>

      {/* Redesigned Card Footer Actions */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/10">
        
        {/* Left: View Details */}
        <button
          type="button"
          onClick={() => onViewDetails(post)}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest transition-colors select-none"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>View Details</span>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isOpportunity && post.is_active && (
            <button
              type="button"
              onClick={() => onViewRegistrations(post)}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-all"
              title="View Applicants"
            >
              <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>{registrations.length} Reg</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(post)}
            className="p-1.5 h-8 w-8 rounded-xl border border-slate-250 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors shadow-sm"
            title="Edit Notice"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className="p-1.5 h-8 w-8 rounded-xl border border-red-100 bg-red-50/20 hover:bg-red-50 text-red-500 hover:text-red-700 flex items-center justify-center transition-colors shadow-sm"
            title="Delete Notice"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
      
    </Card>
  );
};

export default AdminPostCard;
