import React, { useState, useEffect } from 'react';
import { useMaterialsConfig, useUpdateMaterialsConfig } from '../../features/materials/hooks/useMaterialsConfig';
import { 
  FileText, Link2, Eye, RefreshCw, CheckCircle2, 
  AlertCircle, Copy, ExternalLink, School 
} from 'lucide-react';
import materialsIllustration from '../../assets/materials_illustration.jpg';
import heroIllustration from '../../assets/hero.png';

export const Materials: React.FC = () => {
  const { data: config, isLoading, error: fetchError, refetch } = useMaterialsConfig();
  const updateMutation = useUpdateMaterialsConfig();

  // Local Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync loaded configuration into local state
  useEffect(() => {
    if (config) {
      setTitle(config.title || '');
      setDescription(config.description || '');
      setDriveUrl(config.drive_url || '');
    }
  }, [config]);

  const handleCopyUrl = () => {
    if (!driveUrl) return;
    navigator.clipboard.writeText(driveUrl);
    setSuccessMsg('Google Drive URL copied to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setFormError(null);
    setSuccessMsg(null);

    if (!driveUrl.trim()) {
      setFormError('Google Drive Folder URL is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateMutation.mutateAsync({
        id: config.id,
        title: title.trim(),
        description: description.trim(),
        drive_url: driveUrl.trim()
      });
      setSuccessMsg('Materials configuration updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save configuration details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-16 px-4 sm:px-0">
      
      {/* Header Banner Section */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>Materials Management</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            Configure titles, descriptions, and Google Drive URL mappings for university academic worksheets.
          </p>
        </div>
        
        <div className="relative shrink-0 select-none pointer-events-none">
          <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <img 
            src={materialsIllustration} 
            alt="Materials Google Drive 3D Illustration" 
            className="h-20 w-20 sm:h-24 sm:w-24 object-contain relative z-10 rounded-2xl"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 bg-white border border-slate-150 rounded-3xl animate-pulse shadow-sm" />
      ) : fetchError ? (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">Failed to Retrieve Configuration</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed max-w-sm mx-auto">
            Please check your internet connection or reload the database configuration table.
          </p>
          <button 
            onClick={() => refetch()} 
            className="h-9 px-4.5 bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 flex items-center gap-1.5 mx-auto active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Form Editor Card */}
          <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 space-y-5">
            
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <School className="h-4.5 w-4.5 text-[#0B3C5D]" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Google Drive Settings
              </h2>
            </div>

            {/* Form Feedback Alerts */}
            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                Materials Portal Title
              </label>
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-1.5 flex items-center gap-3 focus-within:border-secondary focus-within:bg-white transition-all shadow-sm">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Preparation Materials"
                  className="w-full bg-transparent focus:outline-none text-xs font-semibold text-slate-850 h-8"
                />
              </div>
            </div>

            {/* Subtitle / Description Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                Portal Subtitle / Description
              </label>
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-start gap-3 focus-within:border-secondary focus-within:bg-white transition-all shadow-sm">
                <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Access curated aptitude worksheets, coding resources..."
                  className="w-full bg-transparent focus:outline-none text-xs font-semibold text-slate-850 leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Google Drive Folder URL */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-0.5">
                Google Drive Folder URL
              </label>
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl pl-4 pr-2 py-1.5 flex items-center gap-3 focus-within:border-secondary focus-within:bg-white transition-all shadow-sm">
                <Link2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="url"
                  required
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-transparent focus:outline-none text-xs font-semibold text-slate-850 h-8"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-655 rounded-lg transition-colors shrink-0"
                  title="Copy Link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all select-none active:scale-[0.98] shadow-md shadow-slate-900/5 mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>Save Drive Configuration</span>
                </>
              )}
            </button>

          </div>

          {/* Quick Preview Dashboard Card */}
          <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-500 font-black text-[9px] uppercase tracking-wider">
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                <span>Live Student Portal Preview</span>
              </div>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>View Full</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Replicated Student Materials card UI */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-100 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between gap-4 select-none">
              <div className="space-y-3 relative z-10 flex-1">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-snug">
                    {title || 'Preparation Materials'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed max-w-sm">
                    {description || 'Access curated worksheets and guidelines.'}
                  </p>
                </div>
                
                <div>
                  <span className="inline-flex px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-lg select-none">
                    Active
                  </span>
                </div>
              </div>

              <div className="h-20 w-28 sm:h-24 sm:w-32 relative z-10 shrink-0 pointer-events-none select-none">
                <img 
                  src={heroIllustration} 
                  alt="Student Prep Hero Logo" 
                  className="h-full w-full object-contain filter drop-shadow-sm"
                />
              </div>
            </div>

          </div>

        </form>
      )}

    </div>
  );
};

export default Materials;
