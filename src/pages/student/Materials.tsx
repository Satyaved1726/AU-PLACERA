import React from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useMaterialsConfig } from '../../features/materials/hooks/useMaterialsConfig';
import { BookOpen, FolderOpen, ExternalLink, HelpCircle, GraduationCap, Code, FileText } from 'lucide-react';

export const Materials: React.FC = () => {
  const { data: config, isLoading, error } = useMaterialsConfig();

  // Fallback default Drive link as a guard if database record is missing
  const defaultDriveUrl = 'https://drive.google.com/drive/folders/13yZ2ObuBam41_jrkKhxPyuCx8BmEpxZR';
  const targetUrl = config?.drive_url || defaultDriveUrl;
  const pageTitle = config?.title || 'Preparation Materials';
  const pageDesc = config?.description || 'Access curated aptitude worksheets, coding resources, and interview prep guides.';

  const handleOpenDrive = () => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-12 px-4 sm:px-0">
      
      {/* Header Banner */}
      <div>
        <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <span>{pageTitle}</span>
        </h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 leading-relaxed">
          {pageDesc}
        </p>
      </div>

      {isLoading ? (
        // Premium Pulse Loading View
        <div className="space-y-4">
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
          <div className="h-20 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
        </div>
      ) : error ? (
        // Error / Fallback View
        <Card elevation={2} className="border border-red-200 bg-red-50/30 shadow-sm">
          <CardBody className="p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto border border-red-150">
              <HelpCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-800">Connection Offline</h2>
              <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto">
                Unable to retrieve resources link from Supabase. You can still access materials directly using the default university drive path.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-2 border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 font-black mx-auto"
              onClick={handleOpenDrive}
            >
              <FolderOpen className="h-4 w-4" />
              Open Default Drive Folder
            </Button>
          </CardBody>
        </Card>
      ) : (
        // Premium Core Layout
        <div className="space-y-6">
          <Card elevation={2} className="border border-slate-200 shadow-md overflow-hidden relative">
            {/* Top decorative gradient bar */}
            <div className="h-2 bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335]" />
            <CardBody className="p-6 space-y-5">
              
              {/* Premium Drive Branding details */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-200 shadow-inner shrink-0">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.43 12.98L13.57 2.82C13.23 2.22 12.61 1.85 11.93 1.85C11.25 1.85 10.63 2.22 10.29 2.82L4.43 12.98C4.1 13.57 4.1 14.29 4.43 14.89L7.29 19.86C7.63 20.46 8.25 20.83 8.93 20.83H20.73C21.41 20.83 22.03 20.46 22.37 19.86L25.23 14.89C25.56 14.29 25.56 13.57 25.23 12.98H19.43Z" fill="#34A853" transform="scale(0.8) translate(3, 2)" />
                    <path d="M10.29 2.82C10.63 2.22 11.25 1.85 11.93 1.85C12.61 1.85 13.23 2.22 13.57 2.82L19.43 12.98H8.29L10.29 2.82Z" fill="#FFBA00" transform="scale(0.8) translate(3, 2)" />
                    <path d="M8.29 12.98H4.43C4.1 13.57 4.1 14.29 4.43 14.89L7.29 19.86C7.63 20.46 8.25 20.83 8.93 20.83H12.79L8.29 12.98Z" fill="#2A7FF6" transform="scale(0.8) translate(3, 2)" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">University Resource Drive</h2>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">
                    Google Drive Integration
                  </span>
                </div>
              </div>

              {/* Resource Categories Details */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Curated Contents Inside Folder:
                </h3>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block leading-tight">Aptitude & Logic Worksheets</span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block leading-none">Curated logical, quantitative, and verbal mock worksheets.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 border border-emerald-100">
                      <Code className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block leading-tight">Programming & DSA Guides</span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block leading-none">Data structures cheatsheets, syntax files, and coding solutions.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0 border border-amber-100">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block leading-tight">Company-Specific Placement Guides</span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block leading-none">Past year interview logs, feedback sheets, and expectations.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure authorization message */}
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed bg-blue-50/20 p-3 rounded-xl border border-blue-100/50">
                ⚠️ <strong>Access Notice:</strong> Authentication with this portal grants access to the Drive folder link. File-level read permissions are managed securely by Google Workspace under your university credentials.
              </p>

              {/* Open materials Call To Action button */}
              <Button 
                onClick={handleOpenDrive}
                className="w-full bg-[#1A73E8] hover:bg-[#155CB0] text-white flex items-center justify-center gap-2 py-5 font-black uppercase tracking-wider text-xs rounded-xl shadow-md transition-all shrink-0 select-none"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Open Google Drive Materials</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </Button>

            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Materials;
