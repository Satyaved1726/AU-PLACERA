import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Star, Calendar, Edit2, Archive, RotateCcw, Trash2, MoreVertical, Users } from 'lucide-react';
import { useRegistrations } from '../../../features/registrations/hooks/useRegistrations';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post } from '../../../types';

interface AdminPostCardProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, currentVal: boolean) => void;
  onToggleArchive: (id: string, currentVal: boolean) => void;
  onViewRegistrations: (post: Post) => void;
}

export const AdminPostCard: React.FC<AdminPostCardProps> = ({
  post,
  onEdit,
  onDelete,
  onTogglePriority,
  onToggleArchive,
  onViewRegistrations
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOpportunity = post.post_type === 'opportunity';

  // Load registration counts dynamically from cache/database
  const { data: registrations = [] } = useRegistrations(isOpportunity ? post.id : undefined);

  const handleAction = (callback: () => void) => {
    setMenuOpen(false);
    callback();
  };

  return (
    <Card 
      elevation={post.is_top_priority ? 3 : 2}
      className={`overflow-hidden border transition-all relative rounded-2xl ${
        !post.is_active 
          ? 'border-slate-200 bg-slate-50/50 opacity-70 shadow-none' 
          : post.is_top_priority 
            ? 'border-amber-300 shadow-[0_4px_16px_-4px_rgba(217,179,16,0.06),0_1px_4px_-2px_rgba(217,179,16,0.04)] bg-amber-50/[0.01]' 
            : 'border-slate-200/80 bg-white hover:border-slate-300'
      }`}
    >
      
      {/* Three-dot dropdown backdrop helper */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-20 cursor-default" 
          onClick={() => setMenuOpen(false)} 
        />
      )}

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
            <Badge variant="neutral" className="py-0.5 bg-slate-200 text-slate-500 border-transparent">Archived</Badge>
          )}
        </div>

        {/* 3-Dot Action Button & Dropdown Container */}
        <div className="relative z-30 flex items-center gap-2">
          {/* Registration Count */}
          {isOpportunity && post.is_active && (
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg mr-1 shrink-0 select-none">
              <Users className="h-3 w-3 text-slate-550 shrink-0" />
              <span>{registrations.length} Reg</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-550 transition-colors active:scale-95 shadow-sm"
            aria-label="Actions Menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Animated Dropdown Menu Panel */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute right-0 top-9 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-[10px] font-black uppercase tracking-wider select-none"
              >
                {/* View registrations */}
                {isOpportunity && (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onViewRegistrations(post))}
                    className="w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                  >
                    <Users className="h-4 w-4 text-slate-450 shrink-0" />
                    <span>View Applicants</span>
                  </button>
                )}

                {/* Priority */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onTogglePriority(post.id, post.is_top_priority))}
                  className="w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                >
                  <Star className={`h-4 w-4 shrink-0 ${post.is_top_priority ? 'fill-current text-amber-500' : 'text-slate-450'}`} />
                  <span>{post.is_top_priority ? 'Remove Priority' : 'Mark Priority'}</span>
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onEdit(post))}
                  className="w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4 text-slate-455 shrink-0" />
                  <span>Edit Notice</span>
                </button>

                {/* Archive / Restore */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onToggleArchive(post.id, post.is_active))}
                  className="w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                >
                  {post.is_active ? (
                    <>
                      <Archive className="h-4 w-4 text-slate-450 shrink-0" />
                      <span>Archive Notice</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Restore Notice</span>
                    </>
                  )}
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onDelete(post.id))}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                  <span>Delete Notice</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>

      {/* Body */}
      <CardBody className="p-5 space-y-3">
        <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-snug">
          {post.company_name ? `${post.company_name} — ${post.opportunity_title}` : post.opportunity_title}
        </h3>

        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-xs text-slate-500 font-semibold font-mono line-clamp-3 leading-relaxed whitespace-pre-wrap select-text">
          {post.original_content}
        </div>
      </CardBody>
      
    </Card>
  );
};
export default AdminPostCard;
