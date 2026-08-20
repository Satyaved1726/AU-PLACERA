import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useCreatePost } from '../../features/posts/hooks/useCreatePost';
import { postParser } from '../../features/posts/postParser';
import type { ParsedPost } from '../../features/posts/post.types';
import { PostReviewCard } from '../../features/posts/components/PostReviewCard';
import { useAuth } from '../../features/auth/useAuth';
import { Sparkles, CheckCircle2, ChevronRight, AlertCircle, Plus, Loader2 } from 'lucide-react';

export const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createPostMutation = useCreatePost();

  // Wizard Steps: 1 = Paste, 2 = Review, 3 = Publish Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [rawText, setRawText] = useState('');
  const [detectionMode, setDetectionMode] = useState<'auto' | 'opportunity' | 'announcement'>('auto');
  const [parsedItems, setParsedItems] = useState<ParsedPost[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionBanner, setDetectionBanner] = useState<string | null>(null);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Run parser with a short premium loading experience
  const handleDetect = () => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setErrorMessage('Please paste or type notice text before parsing.');
      return;
    }

    setErrorMessage(null);
    setWarningMessage(null);
    setIsDetecting(true);

    // Simulate premium detection processing
    setTimeout(() => {
      setIsDetecting(false);

      // Manual override selection logic
      if (detectionMode === 'opportunity' || detectionMode === 'announcement') {
        const firstLine = trimmed.split('\n')[0].replace(/[\*\#\_]/g, '').trim();
        let companyName: string | undefined;
        let opportunityTitle = firstLine;

        if (detectionMode === 'opportunity') {
          const splitPatterns = [/\s+-\s+/, /\s+—\s+/, /\s+–\s+/, /\s*:\s*/];
          for (const pattern of splitPatterns) {
            const parts = firstLine.split(pattern);
            if (parts.length >= 2) {
              companyName = parts[0].trim();
              opportunityTitle = parts.slice(1).join(' - ').trim();
              break;
            }
          }
        }

        const items = [
          {
            originalContent: trimmed,
            postType: detectionMode,
            companyName,
            opportunityTitle,
            isTopPriority: false
          }
        ];
        setParsedItems(items);
        setDetectionBanner(`1 notice separated successfully`);
        setStep(2);
        return;
      }

      // Auto Detect Mode split
      const result = postParser.parse(trimmed);
      if (result.posts.length === 0) {
        setErrorMessage(result.error || 'The message format is unrecognized.');
        return;
      }

      setParsedItems(result.posts);
      setDetectionBanner(`${result.posts.length} opportunities detected`);
      
      if (result.error) {
        setWarningMessage(result.error);
      }
      setStep(2);
    }, 700);
  };

  // Inline changes to review list items
  const handleItemChange = (index: number, updated: ParsedPost) => {
    const nextItems = [...parsedItems];
    nextItems[index] = updated;
    setParsedItems(nextItems);
  };

  // Discard item
  const handleDiscardItem = (index: number) => {
    const nextItems = parsedItems.filter((_, i) => i !== index);
    setParsedItems(nextItems);
    if (nextItems.length === 0) {
      setStep(1);
    }
  };

  // Add empty manual review card
  const handleAddManualEntry = () => {
    setParsedItems([
      ...parsedItems,
      {
        originalContent: 'Paste or write specific description text here...',
        postType: 'opportunity',
        companyName: 'New Company',
        opportunityTitle: 'Software Intern',
        isTopPriority: false
      }
    ]);
  };

  // Publish payload to database
  const handlePublishAll = async () => {
    if (parsedItems.length === 0) return;
    setErrorMessage(null);

    const payload = parsedItems.map(item => ({
      original_content: item.originalContent,
      post_type: item.postType,
      company_name: item.postType === 'opportunity' ? (item.companyName || null) : null,
      opportunity_title: item.opportunityTitle || null,
      is_top_priority: item.isTopPriority || false,
      created_by: profile?.id || null,
      is_active: true,
      audience: item.audience || 'general'
    }));

    try {
      await createPostMutation.mutateAsync(payload);
      setStep(3);
    } catch (err: any) {
      console.error('[POSTS] Publishing failed:', err);
      setErrorMessage(`Publishing failed: ${err?.message || err || 'Unknown database error.'}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none pb-12 px-4 sm:px-0">
      
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Create Placement Post</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          Paste the original WhatsApp message and prepare it for publishing.
        </p>
      </div>

      {/* Progress Wizard Indication */}
      <div className="bg-white border border-slate-200/80 rounded-2xl py-4 px-6 shadow-sm flex justify-center items-center">
        <div className="flex items-center gap-3 sm:gap-8 text-[10px] font-black uppercase tracking-wider">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
              step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>01</span>
            <span className={`hidden sm:inline ${step === 1 ? 'text-primary' : 'text-slate-400'}`}>Paste Notice</span>
          </div>

          <ChevronRight className="h-4.5 w-4.5 text-slate-355" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
              step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>02</span>
            <span className={`hidden sm:inline ${step === 2 ? 'text-primary' : 'text-slate-400'}`}>Review Info</span>
          </div>

          <ChevronRight className="h-4.5 w-4.5 text-slate-355" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
              step === 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>03</span>
            <span className={`hidden sm:inline ${step === 3 ? 'text-primary' : 'text-slate-400'}`}>Publish Live</span>
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Auto split results indicator */}
      {step === 2 && detectionBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{detectionBanner}</span>
        </div>
      )}

      {/* Parsing warnings */}
      {warningMessage && step === 2 && (
        <div className="p-4 bg-amber-50 border border-amber-150 text-amber-800 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-bold">Notice splitting info:</span> {warningMessage}
          </div>
        </div>
      )}

      {/* STEP 1: PASTE */}
      {step === 1 && (
        <Card elevation={2} className="border border-slate-200/80 shadow-sm rounded-2xl">
          <CardBody className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="whatsapp-input" className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Paste copy text block
              </label>

              <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 p-1 rounded-xl self-start sm:self-auto select-none overflow-x-auto scrollbar-none max-w-full shrink-0">
                {(['auto', 'opportunity', 'announcement'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDetectionMode(mode)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                      detectionMode === mode
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'auto' ? 'Auto Detect' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                id="whatsapp-input"
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste original copy content. Example:
                
BNP Paribas - PRISM Internship
https://example.com/bnp

Sprinklr - Product Research Intern
https://example.com/sprinklr"
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/5 font-mono text-xs sm:text-sm leading-relaxed transition-all"
              />
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[10px] text-slate-450 font-semibold max-w-sm leading-relaxed">
                Paste WhatsApp messages verbatim. AU Placera will parse the separate items.
              </span>
              <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{rawText.length} characters</span>
                <Button
                  variant="primary"
                  onClick={handleDetect}
                  isLoading={isDetecting}
                  className="h-10 px-5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Detect & Separate</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 2: REVIEW GRID */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase">
                Review Opportunities
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Confirm metadata before writing to Supabase.
              </p>
            </div>
            
            <button
              onClick={handleAddManualEntry}
              className="h-9 px-3.5 inline-flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl active:scale-95 transition-all select-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Entry</span>
            </button>
          </div>

          <div className="space-y-4">
            {parsedItems.map((item, idx) => (
              <PostReviewCard
                key={idx}
                post={item}
                onChange={(updated) => handleItemChange(idx, updated)}
                onDelete={() => handleDiscardItem(idx)}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 pt-5 pb-8">
            <button
              onClick={() => setStep(1)}
              className="w-full sm:w-auto h-10 px-5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all select-none"
            >
              Back to Paste
            </button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setParsedItems([]);
                  setStep(1);
                }}
                className="flex-1 sm:flex-initial h-10 px-5 text-[10px] font-black uppercase tracking-wider text-red-650 bg-red-50 hover:bg-red-100 rounded-xl active:scale-95 transition-all select-none"
              >
                Discard All
              </button>
              <Button
                variant="primary"
                onClick={handlePublishAll}
                isLoading={createPostMutation.isPending}
                className="flex-1 sm:flex-initial h-10 px-6 rounded-xl"
              >
                Publish All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <Card elevation={3} className="border border-slate-200/85 shadow-lg max-w-md mx-auto py-8 rounded-2xl">
          <CardBody className="p-6 text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-9 w-9 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase tracking-wider font-sans">Published Successfully!</h2>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-xs mx-auto uppercase tracking-wide">
                {parsedItems.length} notices have been uploaded to Supabase and are now live for all students.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setRawText('');
                  setParsedItems([]);
                  setStep(1);
                }}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-wider text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl active:scale-95 transition-all select-none"
              >
                Create Another
              </button>
              <button
                onClick={() => navigate('/admin/posts')}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-wider text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md shadow-primary/5 active:scale-95 transition-all select-none"
              >
                View Notice Board
              </button>
            </div>
          </CardBody>
        </Card>
      )}

    </div>
  );
};
export default CreatePost;
