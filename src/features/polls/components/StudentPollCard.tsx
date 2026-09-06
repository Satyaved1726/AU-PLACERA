import React, { useState } from 'react';
import type { PollWithDetails } from '../../../types';
import { useSubmitVote } from '../hooks/usePollMutations';
import { 
  Vote, 
  Check, 
  CheckCircle2, 
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentPollCardProps {
  poll: PollWithDetails;
  studentId: string;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentPollCard: React.FC<StudentPollCardProps> = ({
  poll,
  studentId,
  onToast
}) => {
  const submitVoteMutation = useSubmitVote();
  const userVote = poll.user_vote;
  const hasVoted = !!userVote;

  // Selected option IDs
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    return userVote?.option_ids || [];
  });

  const handleToggleOption = (optionId: string) => {
    if (hasVoted) return;

    if (poll.allow_multiple_answers) {
      if (selectedOptionIds.includes(optionId)) {
        setSelectedOptionIds(selectedOptionIds.filter(id => id !== optionId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optionId]);
      }
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptionIds.length === 0) {
      onToast('Please select an option before voting.', 'error');
      return;
    }

    try {
      await submitVoteMutation.mutateAsync({
        pollId: poll.id,
        studentId,
        optionIds: selectedOptionIds
      });
      onToast('Your vote has been recorded!');
    } catch (err: any) {
      onToast(err?.message || 'Failed to submit vote. Please try again.', 'error');
    }
  };

  const isSubmitting = submitVoteMutation.isPending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm transition-all duration-200 relative ${
        hasVoted
          ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/20 to-white'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header Tag */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0B3C5D]">
          <Vote className="w-4 h-4 text-[#D9B310]" />
          <span>POLL</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Calendar className="w-3 h-3 text-slate-300" />
          <span>{new Date(poll.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Poll Question */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
        {poll.question}
      </h3>

      {/* Multi-answer Subtitle */}
      <div className="mt-1 mb-4">
        <span className="text-[11px] font-semibold text-slate-500">
          {poll.allow_multiple_answers
            ? 'Select one or more'
            : 'Select one option'}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* VOTED STATE                                                        */}
      {/* ------------------------------------------------------------------ */}
      {hasVoted ? (
        <div className="space-y-3">
          {/* Options Display with selection indicator */}
          <div className="space-y-2">
            {poll.options.map(option => {
              const isSelected = userVote.option_ids.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-bold'
                      : 'border-slate-100 bg-slate-50/50 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs sm:text-sm">
                      {option.option_text}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] uppercase tracking-wider font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Confirmation Banner */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your vote has been recorded</span>
            </div>

            <span className="text-[10px] text-slate-400 font-medium">
              Voted on {new Date(userVote.voted_at).toLocaleDateString()} at{' '}
              {new Date(userVote.voted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* VOTING FORM (WhatsApp Style)                                       */
        /* ------------------------------------------------------------------ */
        <div className="space-y-4">
          <div className="space-y-2">
            {poll.options.map(option => {
              const isSelected = selectedOptionIds.includes(option.id);

              return (
                <div
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-1 ring-[#0B3C5D]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox (if multiple) OR Radio (if single) */}
                    {poll.allow_multiple_answers ? (
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[#0B3C5D] bg-[#0B3C5D] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[#0B3C5D] bg-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#0B3C5D]" />}
                      </div>
                    )}

                    <span className={`text-xs sm:text-sm ${isSelected ? 'font-bold text-[#0B3C5D]' : 'font-medium text-slate-800'}`}>
                      {option.option_text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote Button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={selectedOptionIds.length === 0 || isSubmitting}
              onClick={handleVote}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording Vote...</span>
                </>
              ) : (
                <span>Vote</span>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
