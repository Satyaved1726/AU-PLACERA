import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePost } from '../../features/posts/hooks/useCreatePost';
import { postService } from '../../features/posts/postService';
import { postParser } from '../../features/posts/postParser';
import type { ParsedPost } from '../../features/posts/post.types';
import { PostReviewCard } from '../../features/posts/components/PostReviewCard';
import { useAuth } from '../../features/auth/useAuth';
import { supabase } from '../../lib/supabase';
import { 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, 
  Plus, Loader2, ClipboardCheck, Info, Briefcase, Megaphone, ArrowRight, Bell
} from 'lucide-react';
import createPostIllustration from '../../assets/create_post_illustration.jpg';

export const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const createPostMutation = useCreatePost();

  // Wizard Steps: 1 = Paste, 2 = Review, 3 = Publish Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [publishingStatus, setPublishingStatus] = useState<string | null>(null);
  const [sendNotification, setSendNotification] = useState(false);

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
        originalContent: '',
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

    if (loading) {
      setErrorMessage('User session is still loading. Please wait.');
      return;
    }

    if (!profile?.id) {
      setErrorMessage('Unauthorized: User session not found. Please log in again.');
      return;
    }

    // Validate required fields
    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      if (!item.opportunityTitle?.trim()) {
        setErrorMessage(`Title is required for item #${i + 1}`);
        return;
      }
      if (item.postType === 'opportunity' && !item.companyName?.trim()) {
        setErrorMessage(`Company Name is required for Opportunity #${i + 1}`);
        return;
      }
    }

    const payload = parsedItems.map(item => ({
      original_content: item.originalContent || '',
      post_type: item.postType,
      company_name: item.postType === 'opportunity' ? (item.companyName || null) : null,
      opportunity_title: item.opportunityTitle || null,
      is_top_priority: item.isTopPriority || false,
      created_by: profile.id,
      is_active: true,
      audience: item.audience || 'general'
    }));

    try {
      setPublishingStatus('Publishing notices...');
      const createdPosts = await createPostMutation.mutateAsync(payload);
      
      // Upload attachments sequentially
      for (let i = 0; i < createdPosts.length; i++) {
        const postObj = createdPosts[i];
        const parsedItem = parsedItems[i];
        if (parsedItem.attachments && parsedItem.attachments.length > 0) {
          for (const file of parsedItem.attachments) {
            setPublishingStatus(`Uploading "${file.name}" for "${postObj.opportunity_title || 'Post'}"...`);
            await postService.uploadAttachment(postObj.id, file, profile.id);
          }
        }
      }

      // If notification is toggled ON, send notifications after post creation and attachment upload are complete
      if (sendNotification && createdPosts && createdPosts.length > 0) {
        setPublishingStatus('Sending push notifications...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          for (const postObj of createdPosts) {
            const { error: fnError } = await supabase.functions.invoke('send-push-notification', {
              body: { postId: postObj.id },
              headers: session?.access_token ? {
                Authorization: `Bearer ${session.access_token}`
              } : undefined
            });
            if (fnError) throw fnError;
          }
        } catch (fcmErr: any) {
          console.error('FCM Dispatch error:', fcmErr);
          setWarningMessage('Post published, but notification delivery failed.');
        }
      }

      setStep(3);
    } catch (err: any) {
      setErrorMessage(`Publishing failed: ${err?.message || err || 'Unknown database error.'}`);
    } finally {
      setPublishingStatus(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-16 px-4 sm:px-0">
      
      {/* Header Banner Section */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>Create Placement Post</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            Paste the original WhatsApp message and prepare it for publishing.
          </p>
        </div>
        
        <div className="relative shrink-0 select-none pointer-events-none">
          <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <img 
            src={createPostIllustration} 
            alt="Create Post 3D Illustration" 
            className="h-20 w-20 sm:h-24 sm:w-24 object-contain relative z-10 rounded-2xl"
          />
        </div>
      </div>

      {/* Progress Wizard Indication */}
      <div className="bg-white border border-slate-150 rounded-3xl py-4 px-6 shadow-sm flex justify-center items-center">
        <div className="flex items-center gap-3 sm:gap-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
          
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step >= 1 ? 'bg-[#0B3C5D] text-white shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>01</span>
            <span className={step === 1 ? 'text-[#0B3C5D]' : 'text-slate-450'}>Paste Content</span>
          </div>

          <ChevronRight className="h-4.5 w-4.5 text-slate-300 mx-1.5 mt-[-16px] sm:mt-[-18px]" />

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step >= 2 ? 'bg-[#0B3C5D] text-white shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>02</span>
            <span className={step === 2 ? 'text-[#0B3C5D]' : 'text-slate-450'}>Review</span>
          </div>

          <ChevronRight className="h-4.5 w-4.5 text-slate-300 mx-1.5 mt-[-16px] sm:mt-[-18px]" />

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step === 3 ? 'bg-[#0B3C5D] text-white shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>03</span>
            <span className={step === 3 ? 'text-[#0B3C5D]' : 'text-slate-450'}>Publish</span>
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
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
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

      {/* STEP 1: PASTE CONTENT */}
      {step === 1 && (
        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 space-y-5">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4.5 w-4.5 text-[#0B3C5D]" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Paste WhatsApp Content
              </h2>
            </div>

            {/* Mode selection tabs */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/50 p-1 rounded-xl overflow-x-auto scrollbar-none max-w-full shrink-0">
              <button
                type="button"
                onClick={() => setDetectionMode('auto')}
                className={`px-3.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                  detectionMode === 'auto'
                    ? 'bg-[#F0F7FF] text-[#2563EB] border border-blue-150/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>Auto Detect</span>
              </button>
              <button
                type="button"
                onClick={() => setDetectionMode('opportunity')}
                className={`px-3.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                  detectionMode === 'opportunity'
                    ? 'bg-[#F0F7FF] text-[#2563EB] border border-blue-150/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Briefcase className="h-3 w-3 shrink-0" />
                <span>Opportunity</span>
              </button>
              <button
                type="button"
                onClick={() => setDetectionMode('announcement')}
                className={`px-3.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                  detectionMode === 'announcement'
                    ? 'bg-[#F0F7FF] text-[#2563EB] border border-blue-150/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Megaphone className="h-3 w-3 shrink-0" />
                <span>Announcement</span>
              </button>
            </div>
          </div>

          {/* Large text container */}
          <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 shadow-sm focus-within:border-secondary focus-within:bg-white transition-all">
            <textarea
              id="whatsapp-input"
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste WhatsApp message here..."
              className="w-full p-4 bg-transparent focus:outline-none font-sans text-xs sm:text-sm leading-relaxed text-slate-800 resize-none"
            />
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-850 bg-slate-200/60 hover:bg-slate-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all"
              >
                Clear
              </button>
            )}
            <div className="absolute bottom-2.5 right-3.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider select-none pointer-events-none">
              {rawText.length} / 5000
            </div>
          </div>

          {/* Info Banner Alert */}
          <div className="bg-[#F4F9FF]/80 border border-blue-100/50 rounded-2xl p-4 flex items-start gap-2.5 select-text shadow-sm">
            <Info className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed">
              AU Placera will automatically detect and separate items for you.
            </p>
          </div>

          {/* Submit Action button */}
          <button
            type="button"
            onClick={handleDetect}
            disabled={isDetecting || !rawText.trim()}
            className="w-full py-3.5 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all select-none active:scale-[0.98] shadow-md shadow-slate-900/5 disabled:opacity-50"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Separating Content...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: REVIEW PANEL */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 px-1">
            <div>
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                Review Opportunities
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
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

          {publishingStatus && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F0F7FF] border border-blue-100 rounded-xl text-primary text-[10px] font-bold">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
              <span>{publishingStatus}</span>
            </div>
          )}

          {/* Push Notification Toggle Option */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">🔔 Send Push Notification</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  {sendNotification ? '✨ Alerting students instantly upon successful publication' : 'Alert students instantly via device notification'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSendNotification(!sendNotification)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                sendNotification ? 'bg-[#0B3C5D]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sendNotification ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 pb-8">
            <button
              onClick={() => setStep(1)}
              disabled={createPostMutation.isPending || !!publishingStatus}
              className="w-full sm:w-auto h-10 px-5 text-[10px] font-black uppercase tracking-wider text-slate-555 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all select-none disabled:opacity-50"
            >
              Back to Paste
            </button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setParsedItems([]);
                  setStep(1);
                }}
                disabled={createPostMutation.isPending || !!publishingStatus}
                className="flex-1 sm:flex-initial h-10 px-5 text-[10px] font-black uppercase tracking-wider text-red-650 bg-red-50 hover:bg-red-100 rounded-xl active:scale-95 transition-all select-none disabled:opacity-50"
              >
                Discard All
              </button>
              <button
                onClick={handlePublishAll}
                disabled={createPostMutation.isPending || loading || !!publishingStatus}
                className="flex-1 sm:flex-initial h-10 px-6 rounded-xl bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white text-[10px] font-black uppercase tracking-wider transition-all select-none active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {publishingStatus ? 'Publishing...' : 'Publish All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS BLOCK */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 shadow-lg max-w-md mx-auto py-8 rounded-3xl p-6 text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-9 w-9 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase tracking-wider">Published Successfully!</h2>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-xs mx-auto uppercase tracking-wide">
              {parsedItems.length} notices have been uploaded to Supabase and are now live for all students.
            </p>
            {warningMessage && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex items-center justify-center gap-2 max-w-xs mx-auto mt-4">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
                <span>{warningMessage}</span>
              </div>
            )}
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
              className="flex-1 h-10 text-[10px] font-black uppercase tracking-wider text-white bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 rounded-xl shadow-md active:scale-95 transition-all select-none"
            >
              View Notice Board
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreatePost;
