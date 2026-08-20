import React, { useState } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { useAnnouncements } from '../../features/announcements/hooks/useAnnouncements';
import type { DigitalAnnouncement } from '../../types';
import {
  Megaphone, ExternalLink,
  X, ZoomIn, Download, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Announcements: React.FC = () => {
  const { profile } = useAuth();
  const { data: announcements = [], isLoading, error } = useAnnouncements();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected announcement for Lightbox
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<DigitalAnnouncement | null>(null);

  // Filtered list: respect OIA eligibility
  const visibleAnnouncements = announcements.filter(ann => {
    // If flyer is OIA exclusive, student must be oia_eligible
    if (ann.is_oia && !profile?.oia_eligible) return false;

    const textMatch = (
      ann.title + ' ' + (ann.description || '')
    ).toLowerCase().includes(searchQuery.toLowerCase());

    return textMatch;
  });

  return (
    <div className="space-y-8 max-w-xl mx-auto pb-12 select-none px-4 sm:px-0">

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Digital Notice Board</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Active visual drives, eligibility posters, and placement notices.
          </p>
        </div>

        {/* Search */}
        <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <Megaphone className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>Unable to fetch notices at this time. Please check connection.</span>
        </div>
      )}

      {/* SKELETON LOADERS */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0" />
                <div className="space-y-2 flex-grow">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
              <div className="h-64 bg-slate-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && visibleAnnouncements.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Megaphone className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No Notices active</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            There are no visual notices targeted to your profile currently active.
          </p>
        </div>
      )}

      {/* NOTICES LIST (Vertical list like the screenshot feed) */}
      {!isLoading && visibleAnnouncements.length > 0 && (
        <div className="space-y-6">
          {visibleAnnouncements.map(ann => {
            const isPdf = ann.image_url.toLowerCase().split('?')[0].endsWith('.pdf');
            const initials = ann.profiles?.full_name 
              ? ann.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : 'PC';

            return (
              <div
                key={ann.id}
                className="bg-white border border-slate-100/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-5 space-y-4 hover:shadow-soft transition-all"
              >
                {/* 1. Creator info header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-black text-xs shrink-0 uppercase select-none border border-slate-200">
                      {initials}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 text-xs sm:text-sm">
                        {ann.profiles?.full_name || 'Placement Cell'}
                        <span className="text-slate-400 font-semibold"> | {ann.profiles?.role === 'super_admin' ? 'Placement Head' : 'Placement Coordinator'}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="normal-case"> at </span>
                        {new Date(ann.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {ann.is_oia && (
                    <span className="text-[8px] font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase shrink-0">
                      OIA Only
                    </span>
                  )}
                </div>

                {/* 2. Visual Document container (image original size / pdf handler) */}
                <div 
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="cursor-pointer overflow-hidden rounded-xl group relative"
                >
                  {isPdf ? (
                    <div className="p-8 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-3 select-none text-center">
                      <FileText className="h-14 w-14 text-red-500" />
                      <div>
                        <span className="text-xs font-black text-slate-800 block uppercase tracking-wider">{ann.title}</span>
                        <span className="text-[9px] text-slate-405 font-bold uppercase tracking-widest mt-1 block">PDF Placement Flyer</span>
                      </div>
                      <span className="mt-2 h-9 px-4.5 bg-red-50 text-red-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-red-200 flex items-center justify-center">
                        Click to Open Notice
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 flex items-center justify-center border border-slate-100/50 rounded-xl relative overflow-hidden">
                      <img
                        src={ann.image_url}
                        alt={ann.title}
                        className="w-full h-auto object-contain max-h-[600px] group-hover:scale-[1.01] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 bg-white/95 rounded-full text-slate-800 shadow-md">
                          <ZoomIn className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Text Descriptions section */}
                <div className="space-y-2 pt-1.5">
                  <h3 className="text-sm font-black text-slate-800 leading-snug uppercase tracking-wide">
                    {ann.title}
                  </h3>
                  
                  {ann.description && (
                    <p className="text-xs text-slate-550 font-semibold leading-relaxed whitespace-pre-wrap select-text">
                      {ann.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
                    <span />
                    {ann.external_url && (
                      <a
                        href={ann.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-primary-dark flex items-center gap-1"
                      >
                        <span>Apply / View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* FULL RES FLYER LIGHTBOX DETAIL VIEW */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnnouncement(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Lightbox Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-slate-950 sm:rounded-2xl overflow-hidden relative z-10 flex flex-col h-[90vh] sm:h-[85vh]"
            >

              {/* Floating Action Header */}
              <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
                <a
                  href={selectedAnnouncement.image_url}
                  download={`notice-${selectedAnnouncement.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10 flex items-center justify-center shadow-md"
                  title="Download Document"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-5 w-5" />
                </a>
                
                {selectedAnnouncement.external_url && (
                  <a
                    href={selectedAnnouncement.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex items-center justify-center shadow-md"
                    title="Register / View Link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}

                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10 flex items-center justify-center shadow-md"
                  aria-label="Close details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Document display panel */}
              <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
                {selectedAnnouncement.image_url.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                  <iframe
                    src={selectedAnnouncement.image_url}
                    className="w-full h-full border-0 rounded-xl"
                    title={selectedAnnouncement.title}
                  />
                ) : (
                  <img
                    src={selectedAnnouncement.image_url}
                    alt={selectedAnnouncement.title}
                    className="max-w-full max-h-full object-contain rounded shadow-2xl border border-white/5 my-auto"
                  />
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Announcements;
