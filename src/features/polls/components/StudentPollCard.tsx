import React, { useState, useEffect, useMemo } from 'react';
import type { PollWithDetails } from '../../../types';
import { useSaveVote } from '../hooks/usePollMutations';
import { 
  Vote, 
  Check, 
  CheckCircle2, 
  Clock,
  Users,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentPollCardProps {
  poll: PollWithDetails;
  studentId: string;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
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

  // Sync state if remote query updates (only when not actively updating)
  useEffect(() => {
    if (!isUpdating) {
      setSelectedOptionIds(userVote?.option_ids || []);
    }
  }, [userVote?.option_ids, isUpdating]);

  const hasInteracted = selectedOptionIds.length > 0;

  // WhatsApp-style instant vote handler:
  // - Tap unselected option -> Select & save automatically
  // - Tap selected option again -> Deselect & remove vote completely
  // - Tap another option in single poll -> Switch selection & save
  const handleOptionClick = async (optionId: string) => {
    if (isUpdating || !studentId) return;

    let nextOptionIds: string[] = [];

    if (poll.allow_multiple_answers) {
      if (selectedOptionIds.includes(optionId)) {
        // Deselect single option
        nextOptionIds = selectedOptionIds.filter(id => id !== optionId);
      } else {
        // Select additional option
        nextOptionIds = [...selectedOptionIds, optionId];
      }
    } else {
      // Single answer:
      if (selectedOptionIds.includes(optionId)) {
        // Tap selected option again -> Deselect and remove vote completely!
        nextOptionIds = [];
      } else {
        // Tap new option -> Switch vote
        nextOptionIds = [optionId];
      }
    }

    const previousOptionIds = selectedOptionIds;
    // 1. Instant optimistic UI update
    setSelectedOptionIds(nextOptionIds);
    setIsUpdating(true);

    try {
      await saveVoteMutation.mutateAsync({
        pollId: poll.id,
        studentId,
        optionIds: nextOptionIds
      });
      if (nextOptionIds.length === 0 && onToast) {
        onToast('Your response has been removed.');
      }
    } catch {
      // 2. Rollback on failure
      setSelectedOptionIds(previousOptionIds);
      if (onToast) {
        onToast('Unable to update your response. Please try again.', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute instantaneous optimistic stats combining remote counts with local changes
  const { optimisticOptions, optimisticTotalVoters } = useMemo(() => {
    const serverVotedOptionIds = userVote?.option_ids || [];
    const hadPreviousVote = serverVotedOptionIds.length > 0;
    const hasCurrentVote = selectedOptionIds.length > 0;

    const totalVotersDelta = (hasCurrentVote ? 1 : 0) - (hadPreviousVote ? 1 : 0);
    const effectiveTotalVoters = Math.max(0, (poll.total_voted || 0) + totalVotersDelta);

    const calculatedOptions = poll.options.map(option => {
      const wasSelectedOnServer = serverVotedOptionIds.includes(option.id);
      const isSelectedLocally = selectedOptionIds.includes(option.id);

      const countDelta = (isSelectedLocally ? 1 : 0) - (wasSelectedOnServer ? 1 : 0);
      const effectiveCount = Math.max(0, (option.vote_count ?? 0) + countDelta);

      const effectivePercentage = effectiveTotalVoters > 0
        ? Math.round((effectiveCount / effectiveTotalVoters) * 100)
        : 0;

      return {
        ...option,
        effectiveCount,
        effectivePercentage
      };
    });

    return {
      optimisticOptions: calculatedOptions,
      optimisticTotalVoters: effectiveTotalVoters
    };
  }, [poll.options, poll.total_voted, userVote?.option_ids, selectedOptionIds]);

  // Format relative timestamp
  const relativeTime = useMemo(() => {
    try {
      const diffMs = Date.now() - new Date(poll.created_at).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(poll.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  }, [poll.created_at]);

  return (
    <motion.div
      layout
      id={`poll-${poll.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm transition-all duration-200 relative overflow-hidden ${
        isHighlighted
          ? 'ring-2 ring-[#0B3C5D] shadow-md'
          : hasInteracted
          ? 'border-slate-200/90 hover:border-slate-300'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] text-[10px] font-black uppercase tracking-wider">
          <Vote className="w-3.5 h-3.5 text-[#0B3C5D]" />
          <span>POLL</span>
          {poll.allow_multiple_answers && (
            <span className="text-[9px] text-slate-500 font-bold ml-1">
              • Multiple Answers
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{relativeTime}</span>
        </div>
      </div>

      {/* Poll Question */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug mb-1">
        {poll.question}
      </h3>

      {/* Subtitle / Hint */}
      <p className="text-[11px] font-semibold text-slate-400 mb-4">
        {poll.allow_multiple_answers
          ? 'Select one or more options'
          : 'Tap an option to select • Tap again to remove vote'}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* OPTIONS LIST                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-2.5">
        {optimisticOptions.map(option => {
          const isSelected = selectedOptionIds.includes(option.id);
          const voteCount = option.effectiveCount;
          const percentage = option.effectivePercentage;

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
              className={`relative overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.99] min-h-[50px] flex items-center ${
                isSelected
                  ? 'border-[#0B3C5D] ring-1 ring-[#0B3C5D]/20 bg-[#0B3C5D]/5 text-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
              } ${isUpdating ? 'opacity-90' : ''}`}
            >
              {/* WhatsApp-Style Progress Bar (Visible AFTER voting) */}
              {hasInteracted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-400 ease-out pointer-events-none ${
                    isSelected ? 'bg-[#0B3C5D]/15' : 'bg-slate-100/90'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Option Content */}
              <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between gap-3">
                
                {/* Left: Indicator + Option Label */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Selection Indicator */}
                  {poll.allow_multiple_answers ? (
                    // Checkbox (Multiple Answers)
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                        isSelected
                          ? 'border-[#0B3C5D] bg-[#0B3C5D] text-white shadow-sm'
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
                          ? 'border-[#0B3C5D] bg-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0B3C5D]" />
                      )}
                    </div>
                  )}

                  {/* Option Text */}
                  <span
                    className={`text-xs sm:text-sm truncate ${
                      isSelected ? 'font-black text-slate-900' : 'font-medium text-slate-800'
                    }`}
                  >
                    {option.option_text}
                  </span>
                </div>

                {/* Right: Live Result Stats (Visible AFTER student has voted) */}
                {hasInteracted && (
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span
                      className={`text-xs font-black ${
                        isSelected ? 'text-[#0B3C5D]' : 'text-slate-600'
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
      {/* FOOTER: Live Total Voters & Subtle Response Status                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {optimisticTotalVoters} {optimisticTotalVoters === 1 ? 'vote' : 'votes'}
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
            <span>Your response is recorded</span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

