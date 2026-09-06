import React, { useState, useEffect } from 'react';
import type { PollWithDetails } from '../../../types';
import { useSaveVote } from '../hooks/usePollMutations';
import { 
  Vote, 
  Check, 
  CheckCircle2, 
  Users,
  Loader2,
  Star
} from 'lucide-react';

interface StudentPollCardProps {
  poll: PollWithDetails;
  studentId: string;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  isHighlighted?: boolean;
}

export const StudentPollCard: React.FC<StudentPollCardProps> = ({
  poll,
  studentId,
  onToast,
  isHighlighted = false
}) => {
  const saveVoteMutation = useSaveVote();
  const userVote = poll.user_vote;

  // Selected option IDs with optimistic local state
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    return userVote?.option_ids || [];
  });

  // Guard against rapid duplicate clicks
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state if remote query updates
  useEffect(() => {
    if (!isUpdating) {
      setSelectedOptionIds(userVote?.option_ids || []);
    }
  }, [userVote?.option_ids, isUpdating]);

  const hasInteracted = selectedOptionIds.length > 0;

  // WhatsApp-style instant vote handler: Click -> Optimistic State -> Save to DB
  const handleOptionClick = async (optionId: string) => {
    if (isUpdating || !studentId) return;

    let nextOptionIds: string[] = [];

    if (poll.allow_multiple_answers) {
      if (selectedOptionIds.includes(optionId)) {
        // Deselect option (if last option removed, nextOptionIds becomes empty)
        nextOptionIds = selectedOptionIds.filter(id => id !== optionId);
      } else {
        // Select additional option
        nextOptionIds = [...selectedOptionIds, optionId];
      }
    } else {
      // Single answer: click selected option removes response; clicking other option switches vote
      if (selectedOptionIds.includes(optionId)) {
        nextOptionIds = [];
      } else {
        nextOptionIds = [optionId];
      }
    }

    const previousOptionIds = selectedOptionIds;
    // 1. Optimistic UI update
    setSelectedOptionIds(nextOptionIds);
    setIsUpdating(true);

    try {
      await saveVoteMutation.mutateAsync({
        pollId: poll.id,
        studentId,
        optionIds: nextOptionIds
      });
      if (nextOptionIds.length === 0) {
        onToast('Your response has been removed.');
      }
    } catch (_err: any) {
      // 2. Rollback on failure
      setSelectedOptionIds(previousOptionIds);
      onToast('Unable to update your vote. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute live option vote counts and percentages
  const totalVoters = Math.max(poll.total_voted || 0, hasInteracted ? 1 : 0);

  // Format relative timestamp (e.g., "Just now", "2m ago", "1h ago", "2d ago")
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

  return (
    <div
      id={`poll-${poll.id}`}
      className={`transition-all duration-200 rounded-2xl p-5 sm:p-6 select-none relative overflow-hidden bg-white ${
        isHighlighted
          ? 'border-2 border-[#0B3C5D] shadow-md ring-2 ring-[#0B3C5D]/20'
          : poll.is_priority
          ? 'border border-amber-300 shadow-[0_4px_16px_-4px_rgba(217,179,16,0.08),0_1px_4px_-2px_rgba(217,179,16,0.04)] bg-amber-50/[0.02]'
          : 'border border-slate-100 hover:border-slate-200 shadow-soft'
      }`}
    >
      {/* Card Header: Badges & Relative Timestamp */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {poll.is_priority ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 border border-amber-300/70 text-[10px] font-black uppercase tracking-wider">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>PRIORITY</span>
              <span className="text-amber-400 font-normal px-0.5">•</span>
              <span>POLL</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] border border-[#0B3C5D]/15 text-[10px] font-black uppercase tracking-wider">
              <Vote className="w-3.5 h-3.5 text-[#0B3C5D]" />
              <span>POLL</span>
            </div>
          )}

          {poll.allow_multiple_answers && (
            <span className="text-[9px] text-slate-500 font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
              Multiple Choices
            </span>
          )}
        </div>

        <span className="text-[11px] font-semibold text-slate-400">
          {getRelativeTime(poll.created_at)}
        </span>
      </div>

      {/* Poll Question */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
        {poll.question}
      </h3>

      {/* Subtitle / Hint */}
      <p className="text-[11px] font-medium text-slate-400 mt-1 mb-4">
        {poll.allow_multiple_answers
          ? 'Select one or more options'
          : 'Select one option'}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* FULL-WIDTH OPTION BOXES                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-2.5">
        {poll.options.map(option => {
          const isSelected = selectedOptionIds.includes(option.id);
          const voteCount = option.vote_count ?? 0;
          const percentage = option.percentage ?? 0;

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOptionClick(option.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOptionClick(option.id);
                }
              }}
              className={`relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] min-h-[50px] flex items-center ${
                isSelected
                  ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/40 text-emerald-950 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
              } ${isUpdating ? 'opacity-90' : ''}`}
            >
              {/* WhatsApp-Style Horizontal Progress Bar (Visible when student has voted) */}
              {hasInteracted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none ${
                    isSelected ? 'bg-emerald-200/40' : 'bg-slate-100/90'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Option Box Content */}
              <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between gap-3">
                
                {/* Left: Radio/Checkbox Indicator + Option Text */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {poll.allow_multiple_answers ? (
                    // Checkbox (Multiple Answers)
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  ) : (
                    // Radio Button (Single Answer)
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-600 bg-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                  )}

                  {/* Option Label */}
                  <span
                    className={`text-xs sm:text-sm leading-relaxed ${
                      isSelected ? 'font-bold text-emerald-950' : 'font-medium text-slate-800'
                    }`}
                  >
                    {option.option_text}
                  </span>
                </div>

                {/* Right: Live Result Stats (Visible when student has voted) */}
                {hasInteracted && (
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span
                      className={`text-xs font-black ${
                        isSelected ? 'text-emerald-800' : 'text-slate-600'
                      }`}
                    >
                      {percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                      ({voteCount} {voteCount === 1 ? 'vote' : 'votes'})
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER: Live Responses Count & Status                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-4 pt-3.5 flex items-center justify-between border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {totalVoters}{' '}
            {poll.allow_multiple_answers
              ? totalVoters === 1 ? 'participant' : 'participants'
              : totalVoters === 1 ? 'response' : 'responses'}
          </span>
        </div>

        {/* Live Saving Spinner or Recorded Status */}
        {isUpdating ? (
          <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : hasInteracted ? (
          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Response saved</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">
            Tap an option to vote
          </span>
        )}
      </div>
    </div>
  );
};
