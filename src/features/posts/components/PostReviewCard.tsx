import React, { useState } from 'react';
import { Card, CardBody } from '../../../components/common/Card';
import type { ParsedPost } from '../post.types';
import { Trash2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostReviewCardProps {
  post: ParsedPost;
  onChange: (updated: ParsedPost) => void;
  onDelete: () => void;
}

export const PostReviewCard: React.FC<PostReviewCardProps> = ({
  post,
  onChange,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFieldChange = (key: keyof ParsedPost, value: any) => {
    onChange({
      ...post,
      [key]: value
    });
  };

  const isOpportunity = post.postType === 'opportunity';

  return (
    <Card className={`border overflow-hidden transition-all duration-200 ${
      post.isTopPriority 
        ? 'border-amber-200 shadow-sm bg-amber-50/5' 
        : 'border-slate-200 hover:border-slate-300 bg-white'
    }`}>
      {/* Header bar - click to expand/collapse */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Post Type Badge */}
          <span 
            onClick={(e) => {
              e.stopPropagation(); // Avoid expanding/collapsing
              handleFieldChange('postType', isOpportunity ? 'announcement' : 'opportunity');
            }}
            className={`px-2 py-1 text-[9px] font-bold uppercase rounded border cursor-pointer select-none ${
              isOpportunity 
                ? 'bg-blue-50 border-blue-100 text-blue-700' 
                : 'bg-slate-100 border-transparent text-slate-600'
            }`}
            title="Click to toggle type"
          >
            {isOpportunity ? 'Opportunity' : 'Announcement'}
          </span>

          <span className="text-xs font-bold text-slate-800 truncate">
            {isOpportunity 
              ? (post.companyName ? `${post.companyName} — ${post.opportunityTitle || 'Untitled Role'}` : (post.opportunityTitle || 'New Opportunity'))
              : (post.opportunityTitle || 'New Announcement')
            }
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Priority Star Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFieldChange('isTopPriority', !post.isTopPriority);
            }}
            className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${
              post.isTopPriority ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={post.isTopPriority ? 'Remove priority' : 'Mark priority'}
          >
            <Star className={`h-4 w-4 ${post.isTopPriority ? 'fill-current' : ''}`} />
          </button>

          {/* Delete (Discard from batch) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
            title="Discard from publish batch"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Expand Chevron */}
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expandable Inputs Form Area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <CardBody className="p-5 border-t border-slate-100/50 space-y-4">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Post Type
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFieldChange('postType', 'opportunity')}
                      className={`flex-1 py-1.5 px-3 border rounded-md text-xs font-bold transition-colors ${
                        isOpportunity 
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Opportunity
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('postType', 'announcement')}
                      className={`flex-1 py-1.5 px-3 border rounded-md text-xs font-bold transition-colors ${
                        !isOpportunity 
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Announcement
                    </button>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Priority Alert
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('isTopPriority', !post.isTopPriority)}
                    className={`w-full py-1.5 px-3 border rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      post.isTopPriority 
                        ? 'bg-amber-50 border-amber-200 text-amber-600' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${post.isTopPriority ? 'fill-current text-amber-500' : ''}`} />
                    <span>{post.isTopPriority ? 'Top Priority' : 'Normal Priority'}</span>
                  </button>
                </div>
              </div>

              {/* Title & Company inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isOpportunity && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={post.companyName || ''}
                      onChange={(e) => handleFieldChange('companyName', e.target.value)}
                      placeholder="e.g. BNP Paribas"
                      className="block w-full px-3 py-1.5 border border-slate-200 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-xs font-semibold"
                    />
                  </div>
                )}

                <div className={isOpportunity ? '' : 'col-span-1 sm:col-span-2'}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Opportunity / Announcement Title
                  </label>
                  <input
                    type="text"
                    value={post.opportunityTitle || ''}
                    onChange={(e) => handleFieldChange('opportunityTitle', e.target.value)}
                    placeholder="e.g. Software Engineer / Campus Drive details"
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-xs font-semibold"
                  />
                </div>
              </div>

              {/* original content block */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Parsed Segment Text (Original Copy)
                </label>
                <textarea
                  rows={4}
                  value={post.originalContent}
                  onChange={(e) => handleFieldChange('originalContent', e.target.value)}
                  placeholder="Insert raw notice data..."
                  className="block w-full px-3 py-2 border border-slate-200 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Audience selection section */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">
                  Audience / Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('audience', 'general')}
                    className={`py-2 px-3 border rounded-lg text-left transition-all ${
                      (post.audience || 'general') === 'general'
                        ? 'border-primary bg-primary/5 text-slate-800 ring-2 ring-primary/5'
                        : 'border-slate-200 bg-white text-slate-550 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider block">All Students</span>
                    <span className="text-[8px] font-semibold text-slate-400 block mt-0.5 leading-none">Visible to all eligible students</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('audience', 'oia')}
                    className={`py-2 px-3 border rounded-lg text-left transition-all ${
                      post.audience === 'oia'
                        ? 'border-purple-600 bg-purple-50/10 text-slate-850 ring-2 ring-purple-600/5'
                        : 'border-slate-200 bg-white text-slate-550 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider block text-purple-700">OIA Students Only</span>
                    <span className="text-[8px] font-semibold text-slate-400 block mt-0.5 leading-none">Only OIA-approved students can view and register</span>
                  </button>
                </div>
              </div>

            </CardBody>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
export default PostReviewCard;
