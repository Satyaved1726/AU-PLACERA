import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { usePollDetail } from '../../features/polls/hooks/usePollDetail';
import { useCreatePoll, useUpdatePoll } from '../../features/polls/hooks/usePollMutations';
import { ALL_SECTIONS, formatSectionLabel } from '../../features/polls/pollService';
import { 
  Vote, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Users,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PollType, PollStatus, CreatePollPayload } from '../../types';

export const CreatePoll: React.FC = () => {
  const navigate = useNavigate();
  const { id: editPollId } = useParams<{ id: string }>();
  const isEditMode = !!editPollId;

  const { profile } = useAuth();
  const { data: existingPoll, isLoading: isLoadingExisting } = usePollDetail(editPollId || '');
  const createPollMutation = useCreatePoll();
  const updatePollMutation = useUpdatePoll();

  // Form State
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('single_choice');
  const [options, setOptions] = useState<string[]>(['Yes', 'No', 'Maybe']);
  const [targetAllSections, setTargetAllSections] = useState<boolean>(true);
  const [selectedSections, setSelectedSections] = useState<string[]>([...ALL_SECTIONS]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [allowResponseChange, setAllowResponseChange] = useState<boolean>(true);

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (isEditMode && existingPoll) {
      setQuestion(existingPoll.question || '');
      setDescription(existingPoll.description || '');
      setPollType(existingPoll.poll_type || 'single_choice');
      setAllowResponseChange(existingPoll.allow_response_change ?? true);

      if (existingPoll.options && existingPoll.options.length > 0) {
        setOptions(existingPoll.options.map(o => o.option_text));
      }

      const hasAll = existingPoll.audience.some(a => a.section === 'ALL');
      setTargetAllSections(hasAll);
      if (!hasAll) {
        setSelectedSections(existingPoll.audience.map(a => a.section));
      }

      if (existingPoll.start_date) {
        setStartDate(existingPoll.start_date.slice(0, 16));
      }
      if (existingPoll.end_date) {
        setEndDate(existingPoll.end_date.slice(0, 16));
      }
    }
  }, [isEditMode, existingPoll]);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Option handlers
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
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= options.length) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setOptions(updated);
  };

  // Section toggle handler
  const handleToggleSection = (sec: string) => {
    if (selectedSections.includes(sec)) {
      if (selectedSections.length === 1) {
        showToast('Please select at least one section.', 'error');
        return;
      }
      setSelectedSections(selectedSections.filter(s => s !== sec));
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  };

  // Quick preset templates
  const applyPreset = (presetOptions: string[]) => {
    setOptions(presetOptions);
  };

  // Form Submission
  const handleSubmit = async (targetStatus: PollStatus) => {
    if (!profile?.id) {
      showToast('Session expired. Please log in again.', 'error');
      return;
    }

    if (!question.trim()) {
      showToast('Please enter a poll question.', 'error');
      return;
    }

    const cleanOpts = options.map(o => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      showToast('Please provide at least 2 non-empty options.', 'error');
      return;
    }

    const uniqueSet = new Set(cleanOpts.map(o => o.toLowerCase()));
    if (uniqueSet.size !== cleanOpts.length) {
      showToast('Options must be unique. Please remove duplicate options.', 'error');
      return;
    }

    if (startDate && endDate) {
      if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
        showToast('End date must be after start date.', 'error');
        return;
      }
    }

    const sectionsPayload = targetAllSections ? ['ALL'] : selectedSections;

    const payload: CreatePollPayload = {
      question: question.trim(),
      description: description.trim() || undefined,
      poll_type: pollType,
      status: targetStatus,
      department: 'AIML',
      batch: '2023-2027',
      sections: sectionsPayload,
      options: cleanOpts,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
      allow_response_change: allowResponseChange
    };

    try {
      if (isEditMode && editPollId) {
        await updatePollMutation.mutateAsync({
          pollId: editPollId,
          payload
        });
        showToast('Poll updated successfully!');
      } else {
        await createPollMutation.mutateAsync({
          payload,
          adminId: profile.id
        });
        showToast(targetStatus === 'active' ? 'Poll published successfully!' : 'Poll saved as draft!');
      }

      setTimeout(() => {
        navigate('/admin/polls');
      }, 1000);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save poll.', 'error');
    }
  };

  const isSaving = createPollMutation.isPending || updatePollMutation.isPending;

  if (isEditMode && isLoadingExisting) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading poll details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4 sm:px-0 select-none">
      
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

      {/* Navigation & Header */}
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
            {isEditMode ? 'Edit Placement Poll' : 'Create Placement Poll'}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Configure poll questions, target sections, options, and submission rules.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Poll Question & Description Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Vote className="w-4 h-4 text-[#0B3C5D]" />
            <span>1. Poll Details</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poll Question <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Are you interested in participating in the upcoming TCS placement drive?"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide additional context, instructions, or eligibility criteria for students..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poll Type
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setPollType('single_choice')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                    pollType === 'single_choice'
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 text-[#0B3C5D] ring-1 ring-[#0B3C5D]/20 font-black'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xs">Single Choice</span>
                  <span className="text-[10px] text-slate-400 font-normal">Student picks 1 option</span>
                </button>

                <button
                  type="button"
                  disabled
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-dashed border-slate-200 text-slate-400 bg-slate-50/50 cursor-not-allowed text-left"
                  title="Coming in future update"
                >
                  <span className="block text-xs">Multiple Choice</span>
                  <span className="text-[10px] text-slate-400 font-normal">Future expansion</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Poll Options Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>2. Poll Options</span>
            </div>

            {/* Quick Template Presets */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
              <span>Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(['Yes', 'No', 'Maybe'])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all"
              >
                Yes / No / Maybe
              </button>
              <button
                type="button"
                onClick={() => applyPreset(['Interested', 'Not Interested'])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all"
              >
                Interested / Not
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 text-slate-400">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveOption(idx, 'up')}
                    className="p-0.5 hover:text-slate-700 disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === options.length - 1}
                    onClick={() => handleMoveOption(idx, 'down')}
                    className="p-0.5 hover:text-slate-700 disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-6 text-center text-xs font-black text-slate-400">
                  {idx + 1}.
                </div>

                <input
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  disabled={options.length <= 2}
                  className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-lg hover:bg-red-50 transition-all"
                  title="Remove option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddOption}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B3C5D] hover:text-[#082d47] bg-[#0B3C5D]/5 hover:bg-[#0B3C5D]/10 rounded-xl transition-all uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Add Option</span>
          </button>
        </div>

        {/* 3. Target Audience Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>3. Target Audience</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Department
              </span>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                AIML — Artificial Intelligence & Machine Learning
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Academic Batch
              </span>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                2023–2027 (4th Year)
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Target Sections
              </span>

              <label className="flex items-center gap-2 text-xs font-bold text-[#0B3C5D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetAllSections}
                  onChange={e => {
                    const checked = e.target.checked;
                    setTargetAllSections(checked);
                    if (checked) {
                      setSelectedSections([...ALL_SECTIONS]);
                    }
                  }}
                  className="rounded text-[#0B3C5D] focus:ring-[#0B3C5D]"
                />
                <span>All Sections (A–F)</span>
              </label>
            </div>

            {!targetAllSections && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {ALL_SECTIONS.map(sec => {
                  const isChecked = selectedSections.includes(sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleToggleSection(sec)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all ${
                        isChecked
                          ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 text-[#0B3C5D] font-black ring-1 ring-[#0B3C5D]/20'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {formatSectionLabel(sec)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 4. Dates & Settings Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Settings className="w-4 h-4 text-slate-600" />
            <span>4. Dates & Response Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date (Deadline) <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                If omitted, the poll remains active until an admin manually closes it.
              </p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Response Editing Toggle */}
          <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Allow Students to Change Response
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                {allowResponseChange
                  ? 'Students can change their vote as long as the poll is active.'
                  : 'Student response is permanently locked immediately upon submission.'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAllowResponseChange(!allowResponseChange)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                allowResponseChange ? 'bg-[#0B3C5D]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allowResponseChange ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/polls')}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all uppercase tracking-wider"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit('draft')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit('active')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Vote className="w-4 h-4 text-[#D9B310]" />
                  <span>{isEditMode ? 'Update Poll' : 'Publish Poll'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePoll;
