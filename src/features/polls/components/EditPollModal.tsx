import React, { useState, useEffect } from 'react';
import type { PollAnalyticsSummary, PollWithDetails, PollOption } from '../../../types';
import { useUpdatePoll } from '../hooks/usePollMutations';
import { PrioritySelector } from '../../../components/common/PrioritySelector';
import type { PriorityDuration } from '../../posts/post.types';
import { isPriorityActive } from '../../posts/post.types';
import { 
  Vote, 
  X, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll?: PollWithDetails | null;
  analytics?: PollAnalyticsSummary | null;
  onSuccessToast: (message: string) => void;
  onErrorToast: (message: string) => void;
}

interface LocalOption {
  id?: string;
  option_text: string;
  initialText: string;
  votes: number;
}

export const EditPollModal: React.FC<EditPollModalProps> = ({
  isOpen,
  onClose,
  poll,
  analytics,
  onSuccessToast,
  onErrorToast
}) => {
  const activePoll = analytics?.poll || poll;
  const optionBreakdown = analytics?.option_breakdown;
  const updatePollMutation = useUpdatePoll();

  // Question state
  const [question, setQuestion] = useState(activePoll?.question || '');

  // Options state
  const [options, setOptions] = useState<LocalOption[]>([]);
  const [deletedOptionIds, setDeletedOptionIds] = useState<string[]>([]);

  // Deletion confirmation state
  const [optionToDelete, setOptionToDelete] = useState<{ index: number; option: LocalOption } | null>(null);

  // Multiple answers state
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState<boolean>(activePoll?.allow_multiple_answers || false);

  // Priority state
  const [isPriority, setIsPriority] = useState<boolean>(activePoll ? isPriorityActive(activePoll) : false);
  const [priorityDuration, setPriorityDuration] = useState<PriorityDuration>(
    (activePoll?.priority_duration as PriorityDuration) || '24_hours'
  );
  const [customExpiresAt, setCustomExpiresAt] = useState<string>(
    activePoll?.priority_expires_at ? new Date(activePoll.priority_expires_at).toISOString().slice(0, 16) : ''
  );

  // Notify students toggle
  const [notifyStudents, setNotifyStudents] = useState<boolean>(false);

  // Initialize modal state whenever opened or poll data changes
  useEffect(() => {
    if (isOpen && activePoll) {
      setQuestion(activePoll.question);
      setAllowMultipleAnswers(activePoll.allow_multiple_answers);
      setIsPriority(isPriorityActive(activePoll));
      setPriorityDuration((activePoll.priority_duration as PriorityDuration) || '24_hours');
      setCustomExpiresAt(
        activePoll.priority_expires_at ? new Date(activePoll.priority_expires_at).toISOString().slice(0, 16) : ''
      );
      setNotifyStudents(false);
      setDeletedOptionIds([]);
      setOptionToDelete(null);

      // Map existing options with their vote counts from option_breakdown or option.vote_count
      const voteMap = new Map<string, number>();
      if (optionBreakdown) {
        optionBreakdown.forEach(opt => {
          voteMap.set(opt.option_id, opt.votes);
        });
      }

      const initialOpts: LocalOption[] = (activePoll.options || []).map((opt: PollOption) => ({
        id: opt.id,
        option_text: opt.option_text,
        initialText: opt.option_text,
        votes: voteMap.has(opt.id) ? (voteMap.get(opt.id) || 0) : (opt.vote_count || 0)
      }));

      setOptions(initialOpts);
    }
  }, [isOpen, activePoll, optionBreakdown]);

  if (!isOpen || !activePoll) return null;

  const handleAddOption = () => {
    setOptions([
      ...options,
      {
        option_text: '',
        initialText: '',
        votes: 0
      }
    ]);
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = { ...next[index], option_text: val };
    setOptions(next);
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= options.length) return;
    const next = [...options];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setOptions(next);
  };

  const requestDeleteOption = (index: number) => {
    if (options.length <= 2) {
      onErrorToast('A poll must have at least 2 options.');
      return;
    }

    const opt = options[index];
    if (opt.id && opt.votes > 0) {
      // Option has existing student votes -> Show confirmation
      setOptionToDelete({ index, option: opt });
    } else {
      // Option has no votes -> Remove directly
      performDeleteOption(index, opt);
    }
  };

  const performDeleteOption = (index: number, opt: LocalOption) => {
    if (opt.id) {
      setDeletedOptionIds(prev => [...prev, opt.id!]);
    }
    setOptions(options.filter((_, i) => i !== index));
    setOptionToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      onErrorToast('Please enter a poll question.');
      return;
    }

    const cleanOptions = options
      .map((o, idx) => ({
        id: o.id,
        option_text: o.option_text.trim(),
        option_order: idx
      }))
      .filter(o => o.option_text.length > 0);

    if (cleanOptions.length < 2) {
      onErrorToast('Please enter at least 2 non-empty options.');
      return;
    }

    const uniqueSet = new Set(cleanOptions.map(o => o.option_text.toLowerCase()));
    if (uniqueSet.size !== cleanOptions.length) {
      onErrorToast('Duplicate options detected. Each option must be distinct.');
      return;
    }

    if (isPriority && priorityDuration === 'custom') {
      if (!customExpiresAt) {
        onErrorToast('Please select a custom expiration date & time.');
        return;
      }
      if (new Date(customExpiresAt).getTime() <= Date.now()) {
        onErrorToast('Custom expiration date must be in the future.');
        return;
      }
    }

    try {
      await updatePollMutation.mutateAsync({
        payload: {
          pollId: activePoll.id,
          question: question.trim(),
          allow_multiple_answers: allowMultipleAnswers,
          options: cleanOptions,
          deletedOptionIds,
          is_priority: isPriority,
          priority_duration: isPriority ? priorityDuration : undefined,
          priority_expires_at: isPriority && priorityDuration === 'custom' ? new Date(customExpiresAt).toISOString() : undefined,
          notify_students: notifyStudents
        }
      });

      onSuccessToast('Poll updated successfully.');
      onClose();
    } catch (err: any) {
      onErrorToast(err?.message || 'Failed to update poll. Please try again.');
    }
  };

  const isSaving = updatePollMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Edit Poll
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Update question, manage choices & configure voting settings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Question Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Poll Question <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">
                {question.length} chars
              </span>
            </label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Which hackathon are you participating in?"
              rows={2}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D] transition-all resize-none"
            />
          </div>

          {/* Options Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Poll Options <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-slate-400 font-medium">
                  At least 2 unique choices required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0B3C5D] text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const hasVotes = opt.votes > 0;

                return (
                  <div
                    key={opt.id || `new-opt-${idx}`}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 transition-all focus-within:border-[#0B3C5D] focus-within:bg-white focus-within:shadow-sm"
                  >
                    {/* Index Badge */}
                    <span className="w-6 text-center text-xs font-black text-slate-400 shrink-0">
                      {idx + 1}.
                    </span>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt.option_text}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}...`}
                      className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none placeholder:text-slate-400"
                    />

                    {/* Vote Count Pill if option has responses */}
                    {hasVotes && (
                      <span
                        className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg shrink-0"
                        title={`${opt.votes} student${opt.votes !== 1 ? 's' : ''} voted for this option`}
                      >
                        {opt.votes} vote{opt.votes !== 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveOption(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOption(idx, 'down')}
                        disabled={idx === options.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Option Button */}
                    <button
                      type="button"
                      onClick={() => requestDeleteOption(idx)}
                      disabled={options.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      title={hasVotes ? 'Option has votes. Clicking will request confirmation.' : 'Delete option'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multiple Answers Setting */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  Allow Multiple Answers
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Allow students to vote for more than one option.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMultipleAnswers}
                  onChange={e => setAllowMultipleAnswers(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B3C5D]" />
              </label>
            </div>

            {/* Warning if switching from Multiple to Single */}
            {activePoll.allow_multiple_answers && !allowMultipleAnswers && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Caution:</strong> Changing to single-choice will adjust students with multiple selections to retain only their latest choice.
                </span>
              </div>
            )}
          </div>

          {/* Priority Status Section */}
          <PrioritySelector
            isPriority={isPriority}
            onTogglePriority={setIsPriority}
            duration={priorityDuration}
            onDurationChange={setPriorityDuration}
            customExpiresAt={customExpiresAt}
            onCustomExpiresAtChange={setCustomExpiresAt}
            label="Priority Status"
            description="Pin this poll to top of student feed."
          />

          {/* Optional Push Notification on Save */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                Notify Students of Update
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Send a push notification informing students about this update.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifyStudents}
                onChange={e => setNotifyStudents(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B3C5D]" />
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D9B310]" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#D9B310]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* OPTION DELETION CONFIRMATION MODAL */}
        <AnimatePresence>
          {optionToDelete && (
            <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
              >
                <div className="flex items-center gap-2.5 text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Delete Option
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  This option <span className="font-bold text-slate-900">"{optionToDelete.option.option_text}"</span> currently has <span className="font-black text-red-600">{optionToDelete.option.votes} response{optionToDelete.option.votes !== 1 ? 's' : ''}</span>.
                </p>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Deleting it will remove this option from the poll and remove its associated response selections. Other selections made by students will remain intact. Continue?
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOptionToDelete(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => performDeleteOption(optionToDelete.index, optionToDelete.option)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-md shadow-red-600/20"
                  >
                    Delete Option
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default EditPollModal;
