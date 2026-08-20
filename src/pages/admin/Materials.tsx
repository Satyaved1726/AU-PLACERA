import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useMaterialsConfig, useUpdateMaterialsConfig } from '../../features/materials/hooks/useMaterialsConfig';
import { BookOpen, Link2, FileText, CheckCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react';


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

  const validateUrl = (url: string) => {
    if (!url.trim()) return 'Google Drive Folder URL is required.';
    if (!url.startsWith('https://drive.google.com/') && !url.startsWith('https://docs.google.com/')) {
      return 'Warning: Link does not appear to be a valid Google Drive address (expected: drive.google.com).';
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setFormError(null);
    setSuccessMsg(null);

    // Validate inputs
    const urlValidation = validateUrl(driveUrl);
    if (urlValidation && urlValidation.includes('required')) {
      setFormError(urlValidation);
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
      
      // Clear success message after 4s
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('[MATERIALS_MGMT] Update failed:', err);
      setFormError(err.message || 'Failed to save configuration details. Please verify your RLS permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUrlWarning = driveUrl && !driveUrl.startsWith('https://drive.google.com/') && !driveUrl.startsWith('https://docs.google.com/');

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-12 px-4 sm:px-0">
      
      {/* Header */}
      <div>
        <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <span>Materials Management</span>
        </h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 leading-relaxed">
          Configure titles, descriptions, and Google Drive URL mappings for university academic worksheets.
        </p>
      </div>

      {isLoading ? (
        // Loading skeleton
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
      ) : fetchError ? (
        // Fetch error console
        <Card elevation={2} className="border border-red-200 bg-red-50/20 shadow-sm">
          <CardBody className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <h2 className="text-xs font-bold text-slate-700">Failed to Retrieve Configuration</h2>
            <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto">
              Verify that the `materials_config` table exists in Supabase and that you have applied Migration 17.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-1.5 mx-auto font-black mt-2">
              <RefreshCw className="h-3 w-3" />
              Retry Connection
            </Button>
          </CardBody>
        </Card>
      ) : !config ? (
        // No active row fallback
        <Card elevation={2} className="border border-amber-200 bg-amber-50/20 shadow-sm">
          <CardBody className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
            <h2 className="text-xs font-bold text-slate-700">No Configuration Seeding Found</h2>
            <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto">
              Please apply Migration 17 to seed the default Materials Drive parameters.
            </p>
          </CardBody>
        </Card>
      ) : (
        // Configuration Editor Form
        <form onSubmit={handleSave} className="space-y-6">
          <Card elevation={2} className="border border-slate-200 shadow-md">
            <CardBody className="p-6 space-y-4">
              
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Google Drive Settings
              </h2>

              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Materials Portal Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Preparation Materials"
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Portal Subtitle/Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Access curated worksheets and guidelines..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:focus:border-primary transition-all font-semibold text-slate-800 resize-none"
                />
              </div>

              {/* URL Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Google Drive Folder URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    required
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-primary transition-all font-semibold text-slate-805"
                  />
                </div>

                {isUrlWarning && (
                  <span className="text-[9px] text-amber-600 font-bold flex items-center gap-1 mt-1 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Warning: Link does not appear to be a standard Google Drive folder URL.</span>
                  </span>
                )}
              </div>

              {/* Success / Error feedbacks */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-150 text-red-600 font-semibold rounded-xl text-[10px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-semibold rounded-xl text-[10px] flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-light text-white flex items-center justify-center gap-2 py-4 font-black uppercase tracking-wider text-[10px] rounded-xl shadow-md transition-all shrink-0 select-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span>Save Drive Configuration</span>
                  </>
                )}
              </Button>

            </CardBody>
          </Card>

          {/* Quick Preview Dashboard Card */}
          <Card elevation={2} className="border border-slate-200 bg-slate-50/50 shadow-sm">
            <CardBody className="p-5 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500 font-black text-[9px] uppercase tracking-wider">
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                <span>Live Student Portal Preview</span>
              </div>
              <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm">
                <span className="text-xs font-black text-slate-800 block">{title || 'Preparation Materials'}</span>
                <span className="text-[9px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">{description || 'Curated aptitude worksheets and mock resources.'}</span>
                <div className="mt-3 py-1.5 px-3 bg-blue-50/50 border border-blue-100 text-blue-600 font-bold text-[9px] uppercase tracking-wider rounded-lg inline-flex items-center gap-1">
                  <span>Target Destination:</span>
                  <span className="font-semibold text-slate-500 lowercase truncate max-w-[200px]">{driveUrl || 'drive.google.com'}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </form>
      )}
    </div>
  );
};

export default Materials;
