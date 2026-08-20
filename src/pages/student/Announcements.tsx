import React, { useState, useEffect } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { useAnnouncements } from '../../features/announcements/hooks/useAnnouncements';
import type { DigitalAnnouncement } from '../../types';
import {
  Megaphone, ExternalLink, Calendar, ShieldCheck,
  ChevronLeft, ChevronRight, X, ZoomIn, Download, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Announcements: React.FC = () => {
  const { profile } = useAuth();
  const { data: announcements = [], isLoading, error } = useAnnouncements();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected announcement for Lightbox
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<DigitalAnnouncement | null>(null);

  // Carousel slide index
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filtered list: respect OIA eligibility
  const visibleAnnouncements = announcements.filter(ann => {
    // If flyer is OIA exclusive, student must be oia_eligible
    if (ann.is_oia && !profile?.oia_eligible) return false;

    const textMatch = (
      ann.title + ' ' + (ann.description || '')
    ).toLowerCase().includes(searchQuery.toLowerCase());

    return textMatch;
  });

  // Autoplay slider effect (only if there are slides)
  useEffect(() => {
    if (visibleAnnouncements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % visibleAnnouncements.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(timer);
  }, [visibleAnnouncements.length]);

  const handleNextSlide = () => {
    if (visibleAnnouncements.length === 0) return;
    setCurrentSlide(prev => (prev + 1) % visibleAnnouncements.length);
  };

  const handlePrevSlide = () => {
    if (visibleAnnouncements.length === 0) return;
    setCurrentSlide(prev => (prev - 1 + visibleAnnouncements.length) % visibleAnnouncements.length);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0">

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Recruitment Flyers</h1>
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
          <span>Unable to fetch announcements at this time. Please check connection.</span>
        </div>
      )}

      {/* SKELETON LOADERS */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-64 sm:h-80 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && visibleAnnouncements.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Megaphone className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No flyers active</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            There are no visual announcements targetted to your profile currently active.
          </p>
        </div>
      )}

      {/* VISUALLY STUNNING CAROUSEL SLIDER (Only if announcements exist & no active search) */}
      {!isLoading && visibleAnnouncements.length > 0 && !searchQuery && (
        <div className="relative h-64 sm:h-96 w-full bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800 group">

          {/* Slides Viewport */}
          <div className="w-full h-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full relative cursor-pointer"
                onClick={() => setSelectedAnnouncement(visibleAnnouncements[currentSlide])}
              >
                {/* Backdrop Blur Poster background */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-[1.05]"
                  style={{ backgroundImage: `url(${visibleAnnouncements[currentSlide].image_url})` }}
                />

                {/* Main Flyer Image */}
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10">
                  <img
                    src={visibleAnnouncements[currentSlide].image_url}
                    alt={visibleAnnouncements[currentSlide].title}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                </div>

                {/* Left/Right Linear Black Gradient Cover */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-15 pointer-events-none" />

                {/* Slide Text Banner overlay */}
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 z-20 pointer-events-none select-none text-white max-w-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {visibleAnnouncements[currentSlide].is_oia && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <ShieldCheck className="h-3 w-3" />
                        <span>OIA Special</span>
                      </span>
                    )}
                    <span className="text-[9px] font-black tracking-widest text-[#D9B310] uppercase bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(visibleAnnouncements[currentSlide].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight drop-shadow uppercase leading-tight">
                    {visibleAnnouncements[currentSlide].title}
                  </h2>
                  {visibleAnnouncements[currentSlide].description && (
                    <p className="text-[10px] text-slate-300 font-semibold line-clamp-1 drop-shadow mt-1">
                      {visibleAnnouncements[currentSlide].description}
                    </p>
                  )}
                </div>

                {/* Zoom Hover Icon Indicator */}
                <div className="absolute top-4 right-4 z-20 p-2 bg-slate-950/50 hover:bg-slate-950 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-4 w-4" />
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls (Arrows) */}
          {visibleAnnouncements.length > 1 && (
            <>
              <button
                onClick={handlePrevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-25 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-25 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          {visibleAnnouncements.length > 1 && (
            <div className="absolute bottom-4 right-6 sm:bottom-6 sm:right-8 z-25 flex gap-1.5 select-none">
              {visibleAnnouncements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-4.5 bg-[#D9B310]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FLYERS LIST GRID TITLE */}
      {!isLoading && visibleAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            {searchQuery ? `Search Results (${visibleAnnouncements.length})` : 'All Active Flyers'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {visibleAnnouncements.map(ann => (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnouncement(ann)}
                className="bg-white border border-slate-205 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col group"
              >
                {/* Visual Cover */}
                <div className="h-44 bg-slate-50 relative overflow-hidden border-b border-slate-100 shrink-0">
                  <img
                    src={ann.image_url}
                    alt={ann.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* OIA indicator badge */}
                  {ann.is_oia && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500 border border-amber-400 text-white rounded text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>OIA</span>
                    </div>
                  )}

                  {/* Hover icon Overlay indicator */}
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-2 bg-white/95 rounded-full text-slate-800 shadow-md">
                      <ZoomIn className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-wide">
                      {ann.title}
                    </h3>
                    {ann.description && (
                      <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                        {ann.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[8px] font-black text-slate-450 uppercase tracking-widest pt-2 border-t border-slate-50 select-none">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <span>{ann.is_oia ? 'OIA Excl.' : 'General'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              className="w-full max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-full max-h-[100vh] sm:max-h-[85vh]"
            >

              {/* Close Button top-right (absolute over the lightbox on desktop, or in header on mobile) */}
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="absolute top-4 right-4 z-40 p-2 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Poster Image display panel (Left Column / Main body) */}
              <div className="flex-1 bg-slate-950 overflow-y-auto p-4 relative flex items-start justify-center min-h-[50vh] md:min-h-0 scrollbar-none">
                <img
                  src={selectedAnnouncement.image_url}
                  alt={selectedAnnouncement.title}
                  className="w-full max-w-full h-auto object-contain rounded shadow-2xl border border-white/5 my-auto"
                />

                {/* OIA indicator banner inside image screen */}
                {selectedAnnouncement.is_oia && (
                  <div className="absolute top-4 left-4 px-2.5 py-1 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-amber-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>OIA Eligible drive</span>
                  </div>
                )}
              </div>

              {/* Information / Action Side Panel (Right Column) */}
              <div className="w-full md:w-80 bg-white p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 overflow-y-auto max-h-[45vh] md:max-h-none shrink-0 scrollbar-none">
                <div className="space-y-4">
                  {/* Meta Group */}
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[9px] font-black tracking-widest text-[#0B3C5D] uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(selectedAnnouncement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    {selectedAnnouncement.is_oia && (
                      <span className="text-[9px] font-black tracking-widest text-amber-700 uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        OIA Only
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-sm font-black text-slate-800 leading-snug uppercase tracking-wide">
                    {selectedAnnouncement.title}
                  </h2>

                  {/* Description */}
                  {selectedAnnouncement.description ? (
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      {selectedAnnouncement.description}
                    </p>
                  ) : (
                    <div className="flex gap-2 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-400 font-semibold select-none">
                      <Info className="h-4 w-4 shrink-0 text-slate-350" />
                      <span>No additional details are provided on this flyer. Refer to the poster contents directly.</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer block */}
                <div className="pt-6 space-y-3 border-t border-slate-100 mt-6 select-none">
                  {/* Download image file */}
                  <a
                    href={selectedAnnouncement.image_url}
                    download={`announcement-${selectedAnnouncement.id}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[0.98] active:scale-95 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Flyer</span>
                  </a>

                  {/* External Registration Link */}
                  {selectedAnnouncement.external_url ? (
                    <a
                      href={selectedAnnouncement.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[0.98] active:scale-95 transition-all shadow-md shadow-[#0B3C5D]/10"
                    >
                      <span>Register / View Link</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider py-2 select-none">
                      No Registration Link Required
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Announcements;
