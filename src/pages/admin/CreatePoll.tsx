import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useCreatePoll } from '../../features/polls/hooks/usePollMutations';
import { 
  Vote, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CreatePoll: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createPollMutation = useCreatePoll();

  // Question state (empty initially)
  const [question, setQuestion] = useState('');

  // Options state: initially 2 empty inputs (NO default text, NO presets)
  const [options, setOptions] = useState<string[]>(['', '']);

  // Allow multiple answers checkbox
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState<boolean>(false);

  // Priority Poll checkbox
  const [isPriority, setIsPriority] = useState<boolean>(false);

  // Notify students push notification checkbox
  const [notifyStudents, setNotifyStudents] = useState<boolean>(true);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast('A poll must have at least 2 options.', 'error');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const nextOptions = [...options];
    nextOptions[index] = val;
    setOptions(nextOptions);
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= options.length) return;
    const nextOptions = [...options];
    const temp = nextOptions[index];
    nextOptions[index] = nextOptions[targetIdx];
    nextOptions[targetIdx] = temp;
    setOptions(nextOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) {
      showToast('Session expired. Please log in again.', 'error');
      return;
    }

    if (!question.trim()) {
      showToast('Please enter a poll question.', 'error');
      return;
    }

    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showToast('Please enter at least 2 non-empty options.', 'error');
      return;
    }

    const uniqueSet = new Set(cleanOptions.map(o => o.toLowerCase()));
    if (uniqueSet.size !== cleanOptions.length) {
      showToast('Duplicate options detected. Please enter unique options.', 'error');
      return;
    }

    try {
      await createPollMutation.mutateAsync({
        payload: {
          question: question.trim(),
          options: cleanOptions,
          allow_multiple_answers: allowMultipleAnswers,
          is_priority: isPriority,
          notify_students: notifyStudents
        },
        adminId: profile.id
      });

      showToast('Poll created successfully!');
      setTimeout(() => {
        navigate('/admin/polls');
      }, 700);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create poll.', 'error');
    }
  };

  const isSubmitting = createPollMutation.isPending;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 px-4 sm:px-0 select-none">
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2.5 border ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-800'
                : 'bg-slate-900 text-white border-white/10'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => navigate('/admin/polls')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
          title="Back to Polls"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0B3C5D]">
            <Vote className="w-4 h-4 text-[#D9B310]" />
            <span>CREATE POLL</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Ask your students a question
          </p>
        </div>
      </div>

      {/* WhatsApp-Style Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Question Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D] placeholder:text-slate-400"
            autoFocus
          />
        </div>

        {/* Options Field */}
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
            Options
          </label>

          <div className="space-y-2.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                {/* Reorder Buttons */}
                <div className="flex flex-col text-slate-300 group-hover:text-slate-500">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveOption(idx, 'up')}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-10"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === options.length - 1}
                    onClick={() => handleMoveOption(idx, 'down')}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-10"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D] placeholder:text-slate-400"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  disabled={options.length <= 2}
                  className="p-2 text-slate-300 hover:text-red-600 disabled:opacity-20 rounded-lg hover:bg-red-50 transition-all"
                  title="Remove option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* + Add Option Button */}
          <button
            type="button"
            onClick={handleAddOption}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B3C5D] hover:text-[#082d47] bg-[#0B3C5D]/5 hover:bg-[#0B3C5D]/10 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Option</span>
          </button>
        </div>

        <hr className="border-slate-100" />

        {/* Options Settings: Allow Multiple Answers, Priority Poll, Notify Students */}
        <div className="space-y-3">
          {/* Allow Multiple Answers Checkbox (WhatsApp Style) */}
          <div
            className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors"
            onClick={() => setAllowMultipleAnswers(!allowMultipleAnswers)}
          >
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Allow multiple answers
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {allowMultipleAnswers
                  ? 'Students can select more than one option.'
                  : 'Students can choose only one option.'}
              </span>
            </div>

            <input
              type="checkbox"
              checked={allowMultipleAnswers}
              onChange={e => setAllowMultipleAnswers(e.target.checked)}
              onClick={e => e.stopPropagation()}
              className="w-4.5 h-4.5 rounded text-[#0B3C5D] focus:ring-[#0B3C5D] cursor-pointer"
            />
          </div>

          {/* Priority Poll Checkbox */}
          <div
            className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-colors ${
              isPriority
                ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40'
                : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100/60'
            }`}
            onClick={() => setIsPriority(!isPriority)}
          >
            <div>
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🚨 Priority Poll</span>
              </span>
              <span className="text-[10px] text-amber-700/80 font-medium block">
                Highlights poll at the top of the Student Notice Stream.
              </span>
            </div>

            <input
              type="checkbox"
              checked={isPriority}
              onChange={e => setIsPriority(e.target.checked)}
              onClick={e => e.stopPropagation()}
              className="w-4.5 h-4.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
            />
          </div>

          {/* Notify Students Checkbox */}
          <div
            className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors"
            onClick={() => setNotifyStudents(!notifyStudents)}
          >
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Notify Students
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Send push notification instantly to all eligible students.
              </span>
            </div>

            <input
              type="checkbox"
              checked={notifyStudents}
              onChange={e => setNotifyStudents(e.target.checked)}
              onClick={e => e.stopPropagation()}
              className="w-4.5 h-4.5 rounded text-[#0B3C5D] focus:ring-[#0B3C5D] cursor-pointer"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Poll...</span>
              </>
            ) : (
              <span>Create Poll</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePoll;
