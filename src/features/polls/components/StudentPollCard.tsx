import React, { useState } from 'react';
import type { PollWithDetails } from '../../../types';
import { useSubmitVote, useUpdateVote } from '../hooks/usePollMutations';
import { 
  CheckCircle2, 
  Clock, 
  Lock, 
  RotateCcw, 
  Calendar, 
  Vote,
  Sparkles
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
  const updateVoteMutation = useUpdateVote();

  const userVote = poll.user_vote;
  const hasVoted = !!userVote;
  const isPollClosed = poll.status === 'closed';

  // Selected option state for voting form
  const [selectedOptionId, setSelectedOptionId] = useState<string>(() => {
    return userVote?.option_ids?.[0] || '';
  });

  // State to toggle edit mode when allowed
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Determine time remaining text
  const getTimeRemaining = (): string | null => {
    if (!poll.end_date) return null;
    const now = Date.now();
    const end = new Date(poll.end_date).getTime();
    const diffMs = end - now;

    if (diffMs <= 0) return 'Deadline ended';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) return `Ends in ${diffDays} days`;
    if (diffDays === 1) return 'Ends tomorrow';
    if (diffHours >= 1) return `Ends in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `Ends in ${diffMins} min${diffMins > 1 ? 's' : ''}`;
  };

  const timeRemaining = getTimeRemaining();

  // Find user's selected option text
  const selectedOption = poll.options.find(o => o.id === userVote?.option_ids?.[0]);

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      onToast('Please select an option before submitting.', 'error');
      return;
    }

    try {
      if (isEditing && userVote) {
        await updateVoteMutation.mutateAsync({
          responseId: userVote.response_id,
          optionIds: [selectedOptionId],
          pollId: poll.id
        });
        setIsEditing(false);
        onToast('Your response has been updated successfully!');
      } else {
        await submitVoteMutation.mutateAsync({
          pollId: poll.id,
          studentId,
          optionIds: [selectedOptionId]
        });
        onToast('Thank you! Your response has been recorded.');
      }
    } catch (err: any) {
      onToast(err?.message || 'Failed to submit response. Please try again.', 'error');
    }
  };

  const isSubmitting = submitVoteMutation.isPending || updateVoteMutation.isPending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200 relative overflow-hidden ${
        hasVoted
          ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white'
          : isPollClosed
          ? 'border-slate-200/70 bg-slate-50/50 opacity-90'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {isPollClosed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300">
              <Lock className="w-3 h-3 text-slate-500" />
              Closed Poll
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Active Poll
            </span>
          )}

          {hasVoted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Responded
            </span>
          )}
        </div>

        {timeRemaining && !isPollClosed && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0 bg-slate-100/80 px-2.5 py-1 rounded-lg">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Poll Question */}
      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
        {poll.question}
      </h3>

      {/* Optional Description */}
      {poll.description && (
        <p className="mt-1.5 text-xs text-slate-600 font-medium leading-relaxed">
          {poll.description}
        </p>
      )}

      {/* Audience Metadata Tags */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
          <Calendar className="w-3 h-3 text-slate-400" />
          {new Date(poll.created_at).toLocaleDateString()}
        </span>
        {poll.end_date && (
          <span className="text-slate-400">
            Deadline: {new Date(poll.end_date).toLocaleDateString()} {new Date(poll.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <hr className="my-4 border-slate-100" />

      {/* ------------------------------------------------------------------ */}
      {/* CASE 1: Student already voted and NOT currently editing            */}
      {/* ------------------------------------------------------------------ */}
      {hasVoted && !isEditing ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  Response Submitted
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700">
                {new Date(userVote.responded_at).toLocaleDateString()} at{' '}
                {new Date(userVote.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-lg p-3 mt-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Your Response
                </span>
                <span className="text-sm font-black text-slate-800">
                  {selectedOption?.option_text || 'Selected Option'}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-md">
                Recorded
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {poll.allow_response_change && !isPollClosed ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedOptionId(userVote.option_ids[0] || '');
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all uppercase tracking-wider active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Change Response
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 italic">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                {isPollClosed ? 'Poll closed. Responses are locked.' : 'Response locked (response editing disabled for this poll).'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* CASE 2: Active voting form (new vote OR editing existing vote)      */
        /* ------------------------------------------------------------------ */
        <div className="space-y-4">
          {isPollClosed ? (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-center">
              <Lock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-600">This poll is closed and no longer accepting responses.</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">The deadline for this poll has passed.</p>
            </div>
          ) : (
            <>
              {isEditing && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Editing your response
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedOptionId(userVote?.option_ids?.[0] || '');
                    }}
                    className="text-[10px] uppercase tracking-wider text-amber-700 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Radio Options List */}
              <div className="space-y-2">
                {poll.options.map(option => {
                  const isSelected = selectedOptionId === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-1 ring-[#0B3C5D]/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#0B3C5D] bg-[#0B3C5D]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[#0B3C5D]' : 'text-slate-700'}`}>
                          {option.option_text}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name={`poll-${poll.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setSelectedOptionId(option.id)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {poll.allow_response_change
                    ? '✓ You can change your response while active'
                    : '⚠ Response cannot be changed once submitted'}
                </span>

                <button
                  type="button"
                  disabled={!selectedOptionId || isSubmitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4 text-[#D9B310]" />
                      <span>{isEditing ? 'Update Response' : 'Submit Response'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};
