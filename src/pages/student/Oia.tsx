import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { useOiaPosts } from '../../features/posts/hooks/useOiaPosts';
import { useAnnouncements } from '../../features/announcements/hooks/useAnnouncements';
import { PostCard } from '../../features/posts/components/PostCard';
import { PostDetail } from '../../features/posts/components/PostDetail';
import type { Post, DigitalAnnouncement } from '../../types';
import { 
  Building2, 
  AlertCircle, 
  Bell, 
  Calendar, 
  ExternalLink, 
  ZoomIn, 
  Download, 
  Info,
  X,
  Megaphone,
  Briefcase
} from 'lucide-react';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

export const Oia: React.FC = () => {
  useAuth();
  
  // Tab state: opportunities vs flyers
  const [activeTab, setActiveTab] = useState<'opportunities' | 'flyers'>('opportunities');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch opportunities and announcements
  const { data: posts, isLoading: postsLoading, error: postsError } = useOiaPosts();
  const { data: announcements = [], isLoading: annLoading, error: annError } = useAnnouncements();

  // Selected post for opportunities modal detail
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Selected announcement for flyer lightbox
  const [selectedAnn, setSelectedAnn] = useState<DigitalAnnouncement | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const postIdParam = searchParams.get('postId');

  // Handle auto-opening of post details from push notification parameter redirect
  useEffect(() => {
    if (postIdParam && posts && posts.length > 0) {
      const targetPost = posts.find(p => p.id === postIdParam);
      if (targetPost) {
        setSelectedPost(targetPost);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('postId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [postIdParam, posts, searchParams, setSearchParams]);

  // Filter posts based on search key
  const filteredPosts = (posts || []).filter(n => {
    const text = (
      (n.company_name || '') + ' ' + 
      (n.opportunity_title || '') + ' ' + 
      n.original_content
    ).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  // Filter announcements (Only OIA visual flyers are shown on this noticeboard)
  const visibleAnnouncements = announcements.filter(ann => {
    if (!ann.is_oia) return false;
    const textMatch = (
      ann.title + ' ' + (ann.description || '')
    ).toLowerCase().includes(searchQuery.toLowerCase());
    return textMatch;
  });

  // Motion variants
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as any } }
  };

  const priorityNotices = filteredPosts.filter(n => n.is_top_priority);
  const normalNotices = filteredPosts.filter(n => !n.is_top_priority);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Welcome OIA Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
          <Building2 className="h-64 w-64 text-[#D9B310]" />
        </div>
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight flex items-center gap-2">
          OIA Portal Access Approved <span className="text-[#D9B310]">⭐</span>
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl font-medium leading-relaxed">
          Welcome to the Office of Industry Alliances. You have verified eligibility access for international recruitment drives, exclusive placements, and global alliance notices.
        </p>
      </div>

      {/* Roster / Notice Streams Search Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">OIA Noticeboard</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
            Industry Alliance Exclusive Notice Stream
          </p>
        </div>
        
        {/* Search Input */}
        <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 border-b-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'opportunities'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Placements & Internships ({filteredPosts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flyers')}
          className={`px-4 py-2 border-b-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'flyers'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>OIA Flyers & Bulletins ({visibleAnnouncements.length})</span>
        </button>
      </div>

      {/* ERRORS */}
      {activeTab === 'opportunities' && postsError && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>We couldn't retrieve OIA placement drives from the server.</span>
        </div>
      )}
      {activeTab === 'flyers' && annError && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <Megaphone className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>Unable to fetch OIA visual announcements.</span>
        </div>
      )}

      {/* OPPORTUNITIES TAB STREAM */}
      {activeTab === 'opportunities' && (
        <>
          {postsLoading && <PostSkeleton />}

          {!postsLoading && filteredPosts.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-205 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
                <Bell className="h-5 w-5 text-slate-400" />
              </div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No OIA placements</h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                There are no OIA-exclusive notice drives posted for your section currently.
              </p>
            </div>
          )}

          {!postsLoading && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Priority Notices block */}
              {priorityNotices.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    ⭐ Priority Notices
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {priorityNotices.map(post => (
                      <motion.div key={post.id} variants={cardVariants}>
                        <PostCard post={post} onViewDetail={setSelectedPost} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Normal Notices block */}
              {normalNotices.length > 0 && (
                <div className="space-y-3">
                  {priorityNotices.length > 0 && (
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      General Notices
                    </h4>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    {normalNotices.map(post => (
                      <motion.div key={post.id} variants={cardVariants}>
                        <PostCard post={post} onViewDetail={setSelectedPost} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* OPPORTUNITY DETAILS DIALOG */}
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        </>
      )}

      {/* FLYERS TAB STREAM */}
      {activeTab === 'flyers' && (
        <>
          {annLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!annLoading && visibleAnnouncements.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-205 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
                <Megaphone className="h-5 w-5 text-slate-400" />
              </div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No flyers active</h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                There are no visual bulletins active in this section.
              </p>
            </div>
          )}

          {!annLoading && visibleAnnouncements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {visibleAnnouncements.map(ann => (
                <div 
                  key={ann.id}
                  onClick={() => setSelectedAnn(ann)}
                  className="bg-white border border-slate-205 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col group"
                >
                  <div className="h-44 bg-slate-50 relative overflow-hidden border-b border-slate-100 shrink-0">
                    <img 
                      src={ann.image_url} 
                      alt={ann.title} 
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500 border border-amber-400 text-white rounded text-[8px] font-black uppercase tracking-wider shadow-sm">
                      OIA
                    </div>

                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-2 bg-white/95 rounded-full text-slate-800 shadow-md">
                        <ZoomIn className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

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

                    <div className="flex items-center justify-between text-[8px] font-black text-slate-450 uppercase tracking-widest pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span>OIA Exclusive</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FLYER LIGHTBOX DETAIL VIEW */}
          <AnimatePresence>
            {selectedAnn && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 select-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedAnn(null)}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-full max-h-[100vh] sm:max-h-[85vh]"
                >
                  <button
                    onClick={() => setSelectedAnn(null)}
                    className="absolute top-4 right-4 z-40 p-2 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex-1 bg-slate-950 overflow-y-auto p-4 relative flex items-start justify-center min-h-[50vh] md:min-h-0 scrollbar-none">
                    <img 
                      src={selectedAnn.image_url} 
                      alt={selectedAnn.title}
                      className="w-full max-w-full h-auto object-contain rounded shadow-2xl border border-white/5 my-auto"
                    />
                  </div>

                  <div className="w-full md:w-80 bg-white p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 overflow-y-auto max-h-[45vh] md:max-h-none shrink-0 scrollbar-none">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black tracking-widest text-[#0B3C5D] uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(selectedAnn.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                      </div>

                      <h2 className="text-sm font-black text-slate-800 leading-snug uppercase tracking-wide">
                        {selectedAnn.title}
                      </h2>

                      {selectedAnn.description ? (
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          {selectedAnn.description}
                        </p>
                      ) : (
                        <div className="flex gap-2 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-405 font-semibold">
                          <Info className="h-4 w-4 shrink-0 text-slate-350" />
                          <span>No additional description provided.</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 space-y-3 border-t border-slate-100 mt-6">
                      <a
                        href={selectedAnn.image_url}
                        download={`oia-${selectedAnn.id}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[0.98] active:scale-95 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download flyer</span>
                      </a>

                      {selectedAnn.external_url ? (
                        <a
                          href={selectedAnn.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[0.98] active:scale-95 transition-all shadow-md"
                        >
                          <span>Apply Link</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <div className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider py-2">
                          No External Link Required
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
};

export default Oia;
